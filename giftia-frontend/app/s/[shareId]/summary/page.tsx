// app/s/[shareId]/summary/page.tsx — ⑤ 集計（贈る人の画面。C）
// 仕様.md「⑤ 集まった声を見て買う」、F-06・F-07・F-08、ADR-0012（数は出さない）
// 【デザイン】1位を中央揃えの大きなカードに。2位以下と「どうやって決めているの？」はたたむ（デザインの Issue）
"use client"; // ← ボタンや取得結果を扱うので、ブラウザで動く画面にする

import { use, useEffect, useState } from "react";
import { reasonLabel } from "@/lib/reasons";
import { ApiError, fetchSummary, postPurchaseClick, type Summary, type SummaryItem, type SummaryTop } from "@/lib/summary";
import ProductImage from "../../../ProductImage";
import Loading from "../../../Loading";           // 【デザイン】読み込み中のくるくる
import Steps from "../../../Steps";

// 1位の「選ばれた理由」の文（仕様.md「⑤」。ADR-0012）
function topReason(top: SummaryTop): string {
  if (top.why === "majority") return "いちばん多くの人が賛成しました";
  if (top.why === "reason" && top.reason_key) return `「${reasonLabel(top.reason_key)}」という声が決め手になりました`;
  return "賛成した人の声をもとに選びました"; // 理由が「とくにない」だけ
}

// 「どうやって決めているの？」を開いたときの文
const HOW_WE_DECIDE =
  "賛成の数と、いいと思った理由の内容をもとに、スコアが高いギフトを選んでいます。スコアが同じときは、レビューの評価が高いほうを選びます。";

// たたむところの小さなリンクの矢印
function Chevron() {
  return (
    <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function SummaryPage({ params }: { params: Promise<{ shareId: string }> }) {
  // URL の [shareId] の部分（Next.js 16 では Promise で渡されるので use で取り出す）
  const { shareId } = use(params);

  // ① 状態（変化するデータ）を覚える箱
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [bought, setBought] = useState<Record<string, boolean>>({}); // 「買う」を記録した商品
  const [buyError, setBuyError] = useState("");
  const [othersOpen, setOthersOpen] = useState(false); // 「その他の候補を見る」を開いているか
  const [helpOpen, setHelpOpen] = useState(false);     // 「どうやって決めているの？」を開いているか

  // ② 画面を開いたとき、集計を API に聞く
  useEffect(() => {
    let cancelled = false;
    fetchSummary(shareId)
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "この共有リストは見つかりません"
            : "集計を読み込めませんでした。時間をおいてもう一度お試しください",
        );
      });
    return () => { cancelled = true; };
  }, [shareId]);

  // ③ 「この商品を買う」：押した記録を残す（S-07）
  async function onBuy(productId: string) {
    setBuyError("");
    try {
      await postPurchaseClick(shareId, productId);
      setBought((b) => ({ ...b, [productId]: true }));
    } catch {
      setBuyError("記録できませんでした。もう一度お試しください");
    }
  }

  // ④ 画面（ヘッダーは layout.tsx が出す）
  if (error) {
    return (
      <main className="page narrow">
        <p className="error-text" role="alert">{error}</p>
      </main>
    );
  }
  if (!summary) {
    return (
      <main className="page narrow">
        <Loading text="読み込み中…" fullPage />
      </main>
    );
  }

  const { top, respondents } = summary;
  // 1位の商品（API が点数の順に返すので、先頭が1位）。1位がなければ、全部を「その他」と同じ形で出す
  const topItem = top ? summary.items.find((item) => item.id === top.id) : undefined;
  const others = summary.items.filter((item) => item.id !== topItem?.id);

  // 2位以下の候補（小さな横長のカード）
  const otherCard = (item: SummaryItem) => (
    <div className="card other-card" key={item.id}>
      <ProductImage category={item.category} className="thumb-small" sizes="88px" />
      <div className="info">
        <p className="brand">{item.brand}</p>
        <p className="name">{item.name}</p>
        <p className="price" style={{ fontSize: 16 }}>{item.price.toLocaleString()}<small>円</small></p>
        <p className="meta">
          {item.comments.length > 0 ? item.comments.map((c) => `「${c}」`).join(" ") : "ひとことはありません"}
        </p>
      </div>
      {buyButton(item.id)}
    </div>
  );

  // 「この商品を買う」と「記録しました」（部品にすると描くたびに作り直されるので、ただの関数で JSX を返す）
  function buyButton(id: string, large = false) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          className={`btn ${large ? "btn-primary btn-large" : "btn-outline"}`}
          disabled={bought[id]}
          onClick={() => onBuy(id)}
        >
          この商品を買う
        </button>
        {bought[id] && <span className="bought" role="status">記録しました</span>}
      </div>
    );
  }

  return (
    <main className="page narrow">
      <Steps current={3} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="title-row">
          <h1 className="title">{top ? "みんなの声で、ギフトが決まりました" : "みんなの声を集めています"}</h1>
          <span className="summary">回答した人：{respondents}人</span>
        </div>
        {top && (
          <p className="lead">回答した{respondents}人の「賛成」と「いいと思った理由」をもとに、Giftia が1つに絞りました。</p>
        )}
      </div>

      {buyError && <p className="error-text" role="alert">{buyError}</p>}

      {top && topItem ? (
        <>
          {/* F-08：Giftia が決めた1位と、その理由（数は出さない） */}
          <section className="top-card" aria-label="みんなの声で選ばれたギフト">
            <div className="ribbon" aria-hidden="true" />
            <div className="top-image">
              <span className="top-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3h8v5a4 4 0 0 1-8 0V3z" />
                  <path d="M12 12v4" />
                  <path d="M8 21h8" />
                  <path d="M10 16h4v5h-4z" />
                </svg>
                みんなの声で選ばれたギフト
              </span>
              <ProductImage category={topItem.category} sizes="(max-width: 640px) 100vw, 500px" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
              <p className="brand" style={{ fontSize: 14 }}>{topItem.brand}</p>
              <h2 className="top-name">{topItem.name}</h2>
            </div>
            <span className="top-price">{topItem.price.toLocaleString()}<small style={{ fontSize: 15, fontWeight: 500 }}>円</small></span>

            <div className="reason-box">
              <strong>選ばれた理由</strong>
              <span>{topReason(top)}</span>
            </div>

            {topItem.comments.length > 0 && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span className="meta">みんなのひとこと</span>
                <ul className="voices">
                  {topItem.comments.map((c, i) => (
                    <li key={i} className="voice">{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              {buyButton(topItem.id, true)}
            </div>

            {/* 2位以下はたたむ（1位以外が目に入りにくいように。目立たない小さなリンク）
                リンクは1位のカードの中、「この商品を買う」の下。開くと、その下に2位以下が並ぶ */}
            {others.length > 0 && (
              <div className="more more-in-card">
                <button type="button" className="link-button" aria-expanded={othersOpen} onClick={() => setOthersOpen((o) => !o)}>
                  {othersOpen ? "その他の候補を閉じる" : `その他の候補を見る（${others.length}件）`}
                  <Chevron />
                </button>
                {othersOpen && <div className="other-list">{others.map(otherCard)}</div>}
              </div>
            )}
          </section>

          {/* 「どうやって決めているの？」はカードの外、下に置く */}
          <div className="more">
            <button type="button" className="link-button" aria-expanded={helpOpen} onClick={() => setHelpOpen((o) => !o)}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6" />
                <path d="M12 17.2h.01" />
              </svg>
              どうやって決めているの？
              <Chevron />
            </button>
            {helpOpen && <p className="help-text">{HOW_WE_DECIDE}</p>}
          </div>
        </>
      ) : (
        <>
          {/* 賛成が全部0：1位は出さず、たたまずに全部の候補を出す */}
          <p className="summary">まだ1件も賛成がありません</p>
          <div className="other-list">{others.map(otherCard)}</div>
        </>
      )}
    </main>
  );
}
