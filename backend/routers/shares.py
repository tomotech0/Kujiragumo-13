# routers/shares.py — 共有リスト（A：じゅんちゃん）
#   POST /api/shares             ② で選んだ候補（1〜3個）から共有リストを作る（F-03）
#   GET  /api/shares/{share_id}  共有リストの候補を読む。④（B）・⑤（C）の画面も使う（F-04・F-06）
# 入出力は 仕様.md「入力と出力」、エラーの返し方は「エラー時の挙動」に合わせる。

import logging
import uuid
from contextlib import contextmanager

import pymysql
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import execute_all, fetch_all

router = APIRouter()
logger = logging.getLogger("uvicorn.error")  # uvicorn のターミナルに出す

MAX_ITEMS = 3  # 候補は3つまで（F-03）
DB_ERROR_MESSAGE = "時間をおいてもう一度お試しください"  # 仕様.md「エラー時の挙動」の「DB につながらない」


@contextmanager
def db_errors_as_500():
    """この with の中で DB が失敗したら（つながらない・.env が足りない など）、500 と決まった文を返す。
    エラーの全文には DB の接続先が入ることがあるので、画面にもログにも出さず、種類の名前だけをログに出す（N-01）。
    400・404（HTTPException）は DB の失敗ではないので、そのまま通す。"""
    try:
        yield
    except (pymysql.MySQLError, OSError) as e:  # OSError は .env が足りないとき（EnvironmentError）も含む
        logger.warning("shares: DB error (%s)", type(e).__name__)
        raise HTTPException(status_code=500, detail=DB_ERROR_MESSAGE) from None


class ShareCreate(BaseModel):
    """POST /api/shares の本文。例 {"product_ids": ["G0001", "G0002", "G0003"]}"""
    product_ids: list[str]


@router.post("/api/shares")
def create_share(body: ShareCreate):
    """選んだ候補で共有リストを作り、番号（share_id）を返す"""
    ids = body.product_ids

    # ① 入力を確かめる（どれかに当てはまれば 400。DB には何も書かない）
    if not 1 <= len(ids) <= MAX_ITEMS:
        raise HTTPException(status_code=400, detail="候補は1〜3個にしてください")
    if len(set(ids)) != len(ids):
        raise HTTPException(status_code=400, detail="同じ商品が2回入っています")

    # ② 商品が products 表にあるか確かめる（U-01）。%s を ID の数だけ並べ、値は params で渡す（N-03）
    placeholders = ", ".join(["%s"] * len(ids))
    with db_errors_as_500():
        found = fetch_all(f"SELECT product_id FROM products WHERE product_id IN ({placeholders})", tuple(ids))
    if len(found) != len(ids):
        raise HTTPException(status_code=400, detail="商品の一覧にない ID があります")

    # ③ 番号を作る。連番だと他人のリストを覗けるので、推測できない UUID（36文字）にする（N-04、ADR-0007）
    share_id = str(uuid.uuid4())

    # ④ 共有リストを1行 ＋ ⑤ 候補を、選んだ順（position 1〜3）つきで書く。
    #    execute_all で1つの束にして確定する。どちらかが失敗したら両方取り消す（候補0個のリストを残さない）
    rows = ", ".join(["(%s, %s, %s)"] * len(ids))
    params = []
    for position, product_id in enumerate(ids, start=1):
        params += [share_id, product_id, position]
    with db_errors_as_500():
        execute_all([
            ("INSERT INTO share_lists (share_id) VALUES (%s)", (share_id,)),
            (f"INSERT INTO share_items (share_id, product_id, position) VALUES {rows}", tuple(params)),
        ])

    return {"share_id": share_id}


@router.get("/api/shares/{share_id}")
def get_share(share_id: str):
    """共有リストの候補を、入れた順に返す"""
    # ① その番号の共有リストがあるか（なければ 404）
    with db_errors_as_500():
        exists = fetch_all("SELECT share_id FROM share_lists WHERE share_id = %s", (share_id,))
    if not exists:
        raise HTTPException(status_code=404, detail="この共有リストは見つかりません")

    # ② 候補（share_items）と商品（products）を product_id でつなぎ、商品名・価格・評価・ショップ名・カテゴリーを取る
    #    （ショップ名とカテゴリーは、画面のショップ名の行とサムネイルに使う。デザインの Issue）
    with db_errors_as_500():
        rows = fetch_all(
            """SELECT si.position, p.product_id, p.product_name, p.price, p.rating, p.brand, p.category
               FROM share_items AS si
               JOIN products AS p ON p.product_id = si.product_id
               WHERE si.share_id = %s
               ORDER BY si.position""",
            (share_id,),
        )
    # ③ 画面で使う項目名に詰め替える（検索 API の to_gift と同じ名前。評価がなければ 0）
    items = [
        {
            "id": r["product_id"],
            "name": r["product_name"],
            "price": r["price"],
            "rating": float(r["rating"]) if r["rating"] is not None else 0,
            "position": r["position"],
            "brand": r["brand"],
            "category": r["category"],
        }
        for r in rows
    ]
    return {"share_id": share_id, "items": items}
