// app/s/[shareId]/page.tsx — ④ 賛成・コメント（同僚の画面。B）
// 仕様.md「④ 賛成・コメント」、F-04、ADR-0010（匿名）・ADR-0013（理由の選択肢・必須）・ADR-0014（賛成はいくつでも）
//
// 開いたときに候補を API（GET /api/shares/{share_id}）から読み、
// 「送信する」で回答を API（POST …/answers）に保存する。
"use client"; // ← ボタンや入力を扱うので、ブラウザで動く画面にする

import { use, useEffect, useState } from "react";
import {
  BODY_MAX,
  ApiError,
  fetchShare,
  postAnswer,
  type ShareItem,
  type AnswerComment,
  type AnswerBody,
} from "@/lib/colleague";
import { REASONS, type ReasonKey } from "@/lib/reasons";
import ProductImage from "../../ProductImage"; // 【デザイン】サムネイル
import Loading from "../../Loading";           // 【デザイン】読み込み中のくるくる
import { CheckIcon } from "../../Steps";        // 賛成している候補に付けるチェックの印

// 仕様.md「エラー時の挙動」の文言
const NOT_FOUND_MESSAGE = "この共有リストは見つかりません";
const RETRY_MESSAGE = "時間をおいてもう一度お試しください";
const NEED_REASON_MESSAGE = "賛成した候補の理由を選んでください";
const EMPTY_MESSAGE = "賛成を1つ以上押すか、ひとことを書いてください";

// 候補ごとの入力（理由とひとこと）
type Draft = { reason: ReasonKey | ""; body: string };
const EMPTY_DRAFT: Draft = { reason: "", body: "" };

// 賛成ボタンの見た目は globals.css の .vote-button（デザインの Issue で、緑から紺に）

// 文字数を数える（絵文字なども1文字と数える。API 側の Python の数え方に合わせる）
const countChars = (s: string) => [...s].length;

export default function ColleaguePage({ params }: { params: Promise<{ shareId: string }> }) {
  // URL の [shareId] の部分（Next.js 16 では Promise で渡されるので use で取り出す）
  const { shareId } = use(params);

  // ① 状態（変化するデータ）を覚える箱
  const [items, setItems] = useState<ShareItem[] | null>(null);  // 候補（読み込むまでは null）
  const [loadError, setLoadError] = useState("");                 // 候補を読めなかったときの文言
  const [votes, setVotes] = useState<string[]>([]);              // 賛成した商品の ID（いくつでも）
  const [drafts, setDrafts] = useState<Record<string, Draft>>({}); // 候補ごとの理由とひとこと
  const [error, setError] = useState("");                         // 送れなかったときの文言
  const [sending, setSending] = useState(false);                  // 送信中かどうか（二重送信を防ぐ）
  const [sent, setSent] = useState(false);                        // 保存できたかどうか

  // ② 画面を開いたとき、共有リストの候補を API に聞く
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

  const draftOf = (id: string) => drafts[id] ?? EMPTY_DRAFT;
  function updateDraft(id: string, change: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? EMPTY_DRAFT), ...change } }));
  }

  // 賛成ボタン：押すと付き、もう一度押すと外れる。外したら、その候補の理由も消す（理由は賛成した候補にだけ選べる）
  function toggleVote(id: string) {
    if (votes.includes(id)) {
      setVotes((v) => v.filter((x) => x !== id));
      updateDraft(id, { reason: "" });
    } else {
      setVotes((v) => [...v, id]);
    }
  }

  // 候補を読めなかったとき／読み込み中
  // ヘッダーは layout.tsx が出す
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

  // ひとことが長すぎる候補があれば、送れないようにする（仕様.md「エラー時の挙動」）
  const tooLong = items.some((item) => countChars(draftOf(item.id).body) > BODY_MAX);

  // ③ 「送信する」の処理
  async function onSend(e: React.FormEvent) {
    e.preventDefault(); // ページの再読み込みを止める
    if (!items || sending || sent) return; // 送信中・送信済みなら何もしない（二重送信を防ぐ）
    setError("");

    // 賛成した候補は、理由を選んでいないと送らない（S-08）
    const voted = items.filter((item) => votes.includes(item.id)); // 画面の並びの順にそろえる
    if (voted.some((item) => !draftOf(item.id).reason)) {
      setError(NEED_REASON_MESSAGE);
      return;
    }

    // 理由かひとことがある候補だけをコメントにする（両方空の候補は送らない）
    // 理由は賛成した候補の分だけ送る
    const comments: AnswerComment[] = [];
    for (const item of items) {
      const { reason, body } = draftOf(item.id);
      const isVoted = votes.includes(item.id);
      const text = body.trim();
      if (!(isVoted && reason) && !text) continue;
      const comment: AnswerComment = { product_id: item.id };
      if (isVoted && reason) comment.reason_key = reason;
      if (text) comment.body = text;
      comments.push(comment);
    }

    // 賛成もひとことも空なら送らない（S-05）
    if (voted.length === 0 && comments.length === 0) {
      setError(EMPTY_MESSAGE);
      return;
    }

    const answer: AnswerBody = { votes: voted.map((item) => item.id), comments };
    setSending(true);
    try {
      await postAnswer(shareId, answer);
      setSent(true); // 保存できたときだけ。送ったあとは送信ボタンを押せなくする（ADR-0010）
    } catch (err) {
      // 失敗したら、お礼は出さずにエラーを出す。入力はそのままなので、もう一度送れる
      setError(err instanceof ApiError && err.status === 404 ? NOT_FOUND_MESSAGE : RETRY_MESSAGE);
    } finally {
      setSending(false);
    }
  }

  // ④ 画面（【デザイン】サムネイル・ショップ名の行・紺の賛成ボタン。デザインの Issue）
  return (
    <main className="page narrow">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 className="title">ギフト候補</h1>
        <p className="lead">
          いいと思ったギフト候補に賛成ボタンを押してください（いくつでも押せます）。賛成した候補には、いいと思った理由を選んでください。
        </p>
        <span className="anon">
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          匿名での回答となります（名前は入れません）
        </span>
      </div>

      <form onSubmit={onSend}>
        {/* 送信中と送ったあとは、まとめて押せなくする */}
        <fieldset disabled={sending || sent} style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {items.map((item) => {
            const draft = draftOf(item.id);
            const voted = votes.includes(item.id);
            const length = countChars(draft.body);
            return (
              <article className={`card answer-card${voted ? " voted" : ""}`} key={item.id}>
                <ProductImage category={item.category} sizes="(max-width: 640px) 100vw, 220px" />
                <div className="card-body">
                  <p className="brand">{item.brand}</p>
                  <h2 className="name">{item.name}</h2>
                  <div className="price-row" style={{ justifyContent: "flex-start", gap: 16 }}>
                    <p className="price">{item.price.toLocaleString()}<small>円</small></p>
                    <p className="meta"><span className="star" aria-hidden="true">★</span> {item.rating}</p>
                  </div>

                  <div className="form answer-row">
                    {/* 賛成はいくつでも。押すと付き、もう一度押すと外れる */}
                    <button
                      type="button"
                      className="vote-button"
                      aria-pressed={voted}
                      onClick={() => toggleVote(item.id)}
                    >
                      {voted && <CheckIcon />}
                      賛成
                    </button>

                    {/* いいと思った理由（賛成した候補だけ選べる。選ぶのは必須） */}
                    <select
                      value={draft.reason}
                      disabled={!voted}
                      aria-label="いいと思った理由"
                      aria-invalid={voted && !draft.reason && error === NEED_REASON_MESSAGE}
                      onChange={(e) => updateDraft(item.id, { reason: e.target.value as ReasonKey | "" })}
                    >
                      <option value="" disabled>{voted ? "いいと思った理由を選んでください" : "賛成すると理由を選べます"}</option>
                      {REASONS.map((r) => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>

                    {/* ひとこと（任意・200文字まで） */}
                    <input
                      className="answer-body"
                      value={draft.body}
                      onChange={(e) => updateDraft(item.id, { body: e.target.value })}
                      placeholder={`ひとこと（任意・${BODY_MAX}文字以内）`}
                      aria-label="ひとこと"
                    />
                  </div>
                  {length > BODY_MAX && (
                    <p className="meta">ひとことは{BODY_MAX}文字までです（いま{length}文字）</p>
                  )}
                </div>
              </article>
            );
          })}

          {/* role="alert"：エラーが出たことを、読み上げソフトにも伝える */}
          {error && <p className="error-text" role="alert">{error}</p>}

          {/* 送信ボタンは中央に置き、幅を広くして目に入りやすくする
              送ったあとはボタンを消し、同じ場所に「送信完了しました。ご回答ありがとうございました。」を出す */}
          <div className="center">
            {sent ? (
              <div className="done-message" role="status">
                <span className="done-icon" aria-hidden="true"><CheckIcon /></span>
                <p>送信完了しました。<br />ご回答ありがとうございました。</p>
              </div>
            ) : (
              // 押せないとき（ひとことが長すぎる）は薄くする。送信中はくるくるを出す
              <button
                type="submit"
                className={`btn btn-primary btn-large${sending ? " is-busy" : ""}`}
                disabled={tooLong}
                aria-disabled={tooLong || sending}
              >
                {sending && <span className="spinner" aria-hidden="true" />}
                {sending ? "送信中…" : "送信する"}
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </main>
  );
}
