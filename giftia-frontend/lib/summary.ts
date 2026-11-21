// lib/summary.ts — ⑤ 集計画面（C-2・C-3）が使う型と、API を呼ぶ関数
// 仕様.md「GET /api/shares/{share_id}/summary」「POST …/purchase-click」
import { API_BASE_URL } from "./config";
import type { ReasonKey } from "./reasons";

// 候補1件（API が F-08 の点数の順に並べて返す）。賛成数・理由の数・点数は返らない（ADR-0012）
export type SummaryItem = {
  id: string;
  name: string;
  price: number;
  brand: string;      // ショップ名（画面のショップ名の行。デザインの Issue）
  category: string;   // カテゴリー（サムネイル画像を選ぶ）
  comments: string[]; // ひとことの本文
};

// 1位の理由：majority＝賛成多数／reason＝決め手（理由は reason_key）／voices＝理由が「とくにない」だけ
export type TopWhy = "majority" | "reason" | "voices";

// F-08：Giftia が決めた1位。賛成が1件もなければ null
export type SummaryTop = {
  id: string;
  name: string;
  why: TopWhy;
  reason_key: ReasonKey | null; // why が "reason" のときだけ入る
};

export type Summary = {
  respondents: number;
  items: SummaryItem[];
  top: SummaryTop | null;
};

// HTTP の状態（404 など）を画面に伝えるためのエラー
export class ApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

export async function fetchSummary(shareId: string): Promise<Summary> {
  const res = await fetch(
    `${API_BASE_URL}/api/shares/${encodeURIComponent(shareId)}/summary`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

export async function postPurchaseClick(shareId: string, productId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/shares/${encodeURIComponent(shareId)}/purchase-click`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    },
  );
  if (!res.ok) throw new ApiError(res.status);
}