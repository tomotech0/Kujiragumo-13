# routers/summary.py — C 担当（⑤集まった声を見て買う）。実装計画 C-1・C-3
#   GET  /api/shares/{share_id}/summary         … 候補を F-08 の点数の順に並べ、1位と理由・ひとことを返す（F-06・F-08、ADR-0012）
#   POST /api/shares/{share_id}/purchase-click  … 購入ボタンを押した記録を残す（F-07）
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import execute, fetch_all
from reasons import REASON_KEYS, REASON_WEIGHTS, VOTE_POINT

router = APIRouter()
logger = logging.getLogger(__name__)

# いいと思った理由の key・重みと、賛成1つの点数は backend/reasons.py から読む（ADR-0012・ADR-0013）


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="この共有リストは見つかりません")


def _server_error() -> HTTPException:
    # 接続情報やエラーの全文は返さない（仕様「エラー時の挙動」）
    return HTTPException(status_code=500, detail="時間をおいてもう一度お試しください")


def _share_exists(share_id: str) -> bool:
    return bool(fetch_all("SELECT 1 AS x FROM share_lists WHERE share_id = %s", (share_id,)))


def rank(candidates: list[dict], votes: dict[str, int], reasons: dict[str, dict[str, int]]) -> tuple[list[str], dict | None]:
    """F-08：候補を点数の高い順に並べ、1位と理由を決める（ADR-0012）。DB は使わないので、単体で確かめられる（U-03〜U-08）。

    candidates：[{"id", "rating", "position"}, …]（rating は評価。ないときは None）
    votes：商品 → 賛成の数
    reasons：商品 → {理由の key → 人数}（その候補に賛成した人が選んだ理由だけ）
    返す：(並べた商品 ID のリスト, 1位 {"id", "why", "reason_key"} または None)
    """
    def score(pid: str) -> int:
        # 点数 ＝ 賛成の数 × VOTE_POINT ＋ 理由の重みの合計
        counts = reasons.get(pid, {})
        return votes.get(pid, 0) * VOTE_POINT + sum(REASON_WEIGHTS[k] * n for k, n in counts.items() if k in REASON_WEIGHTS)

    # 点数が高い順 → 同じならレビューの評価が高い順 → それも同じなら共有リストに入れた順
    # 評価がない商品は 0 として扱う（検索 API の「レビューなしは 0」と同じ。#18 で確認中）
    ordered = sorted(candidates, key=lambda c: (-score(c["id"]), -float(c["rating"] or 0), c["position"]))
    ids = [c["id"] for c in ordered]

    # 賛成が全部0なら1位は出さない
    if not ids or votes.get(ids[0], 0) == 0:
        return ids, None

    first = ids[0]
    others = max((votes.get(pid, 0) for pid in ids[1:]), default=0)
    if votes[first] > others:
        # 1位の候補の賛成数が、ほかのどの候補よりも多い
        return ids, {"id": first, "why": "majority", "reason_key": None}

    # 1位の候補で、重みの合計（人数 × 重み）がいちばん大きい理由。「とくにない」（重み0）は出さない
    # 合計が同じ理由が2つ以上あれば、REASON_KEYS の並び（④の選択肢の並び。重みの大きい順）で先のものにする
    # 重みも同じ「実用的」と「誰からも」が並んだときは、選択肢で先の「実用的」になる（必ず1つに決まる）
    counts = reasons.get(first, {})
    best = None
    for k in REASON_KEYS:
        total = REASON_WEIGHTS[k] * counts.get(k, 0)
        if total > 0 and (best is None or total > REASON_WEIGHTS[best] * counts.get(best, 0)):
            best = k
    if best is None:
        # 理由が「とくにない」だけ
        return ids, {"id": first, "why": "voices", "reason_key": None}
    return ids, {"id": first, "why": "reason", "reason_key": best}


def _build_summary(share_id: str) -> dict:
    # 共有リストの候補（商品名・価格・評価・ショップ名・カテゴリーは products から）
    item_rows = fetch_all(
        """SELECT i.product_id, i.position, p.product_name, p.price, p.rating, p.brand, p.category
           FROM share_items i JOIN products p ON p.product_id = i.product_id
           WHERE i.share_id = %s ORDER BY i.position""",
        (share_id,),
    )
    # 賛成数（商品ごと）
    votes = {
        r["product_id"]: r["n"]
        for r in fetch_all(
            "SELECT product_id, COUNT(*) AS n FROM votes WHERE share_id = %s GROUP BY product_id",
            (share_id,),
        )
    }
    # 理由の数（商品ごと・理由ごと）。その候補に賛成した人が選んだ理由だけを数える
    # （同じ回答 answer_id で、同じ商品に賛成している行があるものだけ。ADR-0012）
    reasons: dict[str, dict[str, int]] = {}
    for r in fetch_all(
        """SELECT c.product_id, c.reason_key, COUNT(*) AS n
           FROM comments c
           JOIN votes v ON v.share_id = c.share_id AND v.product_id = c.product_id AND v.answer_id = c.answer_id
           WHERE c.share_id = %s AND c.reason_key IS NOT NULL
           GROUP BY c.product_id, c.reason_key""",
        (share_id,),
    ):
        if r["reason_key"] in REASON_KEYS:  # なくした理由（tasty・want）は数えない（ADR-0013）
            reasons.setdefault(r["product_id"], {})[r["reason_key"]] = r["n"]
    # ひとこと（古い順）
    bodies: dict[str, list[str]] = {}
    for r in fetch_all(
        """SELECT product_id, body FROM comments
           WHERE share_id = %s AND body IS NOT NULL AND body <> '' ORDER BY comment_id""",
        (share_id,),
    ):
        bodies.setdefault(r["product_id"], []).append(r["body"])
    # 回答した人数 ＝ votes と comments に出てくる answer_id の種類の数（UNION は重複を1つにする）
    respondents = fetch_all(
        """SELECT COUNT(*) AS n FROM (
             SELECT answer_id FROM votes WHERE share_id = %s
             UNION
             SELECT answer_id FROM comments WHERE share_id = %s) AS a""",
        (share_id, share_id),
    )[0]["n"]

    # F-08 の点数で並べ、1位と理由を決める
    candidates = [{"id": r["product_id"], "rating": r["rating"], "position": r["position"]} for r in item_rows]
    ids, top = rank(candidates, votes, reasons)

    # 賛成数・理由の数・点数は返さない（ADR-0012）
    by_id = {r["product_id"]: r for r in item_rows}
    items = [
        {
            "id": pid,
            "name": by_id[pid]["product_name"],
            "price": by_id[pid]["price"],
            "brand": by_id[pid]["brand"],        # ショップ名（画面のショップ名の行。デザインの Issue）
            "category": by_id[pid]["category"],  # カテゴリー（サムネイル画像を選ぶ）
            "comments": bodies.get(pid, []),
        }
        for pid in ids
    ]
    if top is not None:
        # 仕様.md の形（id・name・why・reason_key）にそろえる
        top = {"id": top["id"], "name": by_id[top["id"]]["product_name"], "why": top["why"], "reason_key": top["reason_key"]}
    return {"respondents": respondents, "items": items, "top": top}


@router.get("/api/shares/{share_id}/summary")
def get_summary(share_id: str):
    """回答した人数・候補ごとのひとこと・1位と理由を、F-08 の順に並べて返す（数は返さない）"""
    try:
        if not _share_exists(share_id):
            raise _not_found()
        return _build_summary(share_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("summary の集計に失敗")
        raise _server_error()


class PurchaseClick(BaseModel):
    product_id: str


@router.post("/api/shares/{share_id}/purchase-click")
def purchase_click(share_id: str, body: PurchaseClick):
    """購入ボタンを押した記録を残す（商品ページは開かない。決済もしない）"""
    try:
        if not _share_exists(share_id):
            raise _not_found()
        in_list = fetch_all(
            "SELECT 1 AS x FROM share_items WHERE share_id = %s AND product_id = %s",
            (share_id, body.product_id),
        )
        if not in_list:
            raise HTTPException(status_code=400, detail="この共有リストにない商品です")
        execute(
            "INSERT INTO purchase_clicks (share_id, product_id) VALUES (%s, %s)",
            (share_id, body.product_id),
        )
        return {"ok": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("purchase-click の保存に失敗")
        raise _server_error()