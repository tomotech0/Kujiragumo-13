// app/s/[shareId]/created/page.tsx — ③ 共有URLを送る（贈る人の画面。A：じゅんちゃん）
// 仕様.md「③ 共有URLを送る」、F-03、N-06、ADR-0009
//
// ② の「共有リストを作る」のあとに開く。選んだ候補と共有URLを出し、同僚に送ってもらう。
// 候補は ④ と同じく GET /api/shares/{share_id} から読む（読む関数は lib/colleague.ts の fetchShare を使う）
"use client"; // ← ボタンや window を使うので、ブラウザで動く画面にする

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, fetchShare, type ShareItem } from "@/lib/colleague";
import ProductImage from "../../../ProductImage"; // 【デザイン】サムネイル
import Loading from "../../../Loading";           // 【デザイン】読み込み中のくるくる
import Steps from "../../../Steps";               // 【デザイン】3つのステップ

// 仕様.md「エラー時の挙動」の文言（④ と同じ）
const NOT_FOUND_MESSAGE = "この共有リストは見つかりません";
const RETRY_MESSAGE = "時間をおいてもう一度お試しください";

// 同僚に送る文の例（2026-11-17 じゅんちゃんが決めた文面）。最後に共有URLを付けて出す
const MESSAGE_EXAMPLE = "送別のプレゼント候補を3つ挙げます。いいと思うものに賛成をお願いします！（匿名で集計）";

export default function CreatedPage({ params }: { params: Promise<{ shareId: string }> }) {
  // URL の [shareId] の部分（Next.js 16 では Promise で渡されるので use で取り出す）
  const { shareId } = use(params);

  // ① 状態（変化するデータ）を覚える箱
  const [items, setItems] = useState<ShareItem[] | null>(null); // 候補（読み込むまでは null）
  const [loadError, setLoadError] = useState("");                // 候補を読めなかったときの文言
  const [copyNote, setCopyNote] = useState("");                  // コピーのあとに出す文言

  // ② 画面を開いたとき：候補を API に聞く
  useEffect(() => {
    let cancelled = false; // 画面を離れたあとに結果が届いても、使わない
    fetchShare(shareId)
      .then((share) => { if (!cancelled) setItems(share.items); })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError && err.status === 404 ? NOT_FOUND_MESSAGE : RETRY_MESSAGE);
      });
    return () => { cancelled = true; };
  }, [shareId]);

  // 候補を読めなかったとき／読み込み中（ヘッダーは layout.tsx が出す）
  if (loadError) {
    return (
      <main className="page narrow">
        <p className="error-text" role="alert">{loadError}</p>
      </main>
    );
  }
  if (!items) {
    return (
      <main className="page narrow">
        <Loading text="読み込み中…" fullPage />
      </main>
    );
  }

  // ③ 共有URL＝今開いているページのアドレスの頭（例 http://localhost:3000）＋ /s/{share_id}
  // localhost を直接書かないので、デプロイ先でもそのまま使える（N-06、ADR-0009、S-02）
  // ここに来るのは候補を読み終えたあと（ブラウザの中）なので、window を使える
  const shareUrl = `${window.location.origin}/s/${encodeURIComponent(shareId)}`;

  // 「コピー」を押したとき：共有URLをクリップボードに入れる
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyNote("コピーしました");
    } catch {
      setCopyNote("コピーできませんでした。URL を選んでコピーしてください");
    }
  }

  // ④ 画面（【デザイン】ステップ・サムネイル・ショップ名の行・URL とコピーの枠。デザインの Issue）
  return (
    <main className="page narrow">
      <Steps current={2} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className="title">共有リストができました</h1>
        <p className="summary">下の URL を、一緒に贈る人に送ってください。回答は匿名で集まります。</p>
      </div>

      {/* 選んだ候補（入れた順） */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="field-label">選んだ候補（{items.length}つ）</h2>
        <div className="grid grid-3">
          {items.map((item) => (
            <div className="card" key={item.id}>
              <ProductImage category={item.category} sizes="(max-width: 640px) 100vw, 300px" />
              <div className="card-body">
                <p className="brand">候補{item.position}・{item.brand}</p>
                <h3 className="name">{item.name}</h3>
                <div className="price-row">
                  <p className="price">{item.price.toLocaleString()}<small>円</small></p>
                  <p className="meta"><span className="star" aria-hidden="true">★</span> {item.rating}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        {/* 共有URL とコピー */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor="share-url" className="field-label">共有URL</label>
          <div className="form">
            <input id="share-url" className="share-url" value={shareUrl} readOnly onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-primary" onClick={onCopy} style={{ borderRadius: 10 }}>コピー</button>
          </div>
          {copyNote && <p className="summary" role="status">{copyNote}</p>}
        </div>

        {/* 同僚に送る文の例 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="field-label">送る文の例</p>
          <p className="message-box">
            {MESSAGE_EXAMPLE}
            {"\n"}
            {shareUrl}
          </p>
        </div>
      </section>

      {/* ⑤ へ */}
      <div className="center">
        <Link href={`/s/${encodeURIComponent(shareId)}/summary`} className="btn btn-outline btn-large">集まった声を見る</Link>
      </div>
    </main>
  );
}
