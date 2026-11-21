// app/ResultCard.tsx — 結果カード（部品）。2週目の変更は import の1行だけ（Gift 型の置き場所が lib/api.ts に変わった）
// 【A-1追加】「候補に入れる」（F-03）。選んだかどうか・押せるかどうかは page.tsx が決めて渡す
// 【デザイン】サムネイル・ショップ名の行・「候補に入れる／候補に追加済み」のボタン（デザインの Issue）
import type { Gift } from "@/lib/api";
import ProductImage from "./ProductImage";
import { CheckIcon } from "./Steps";

type Props = {
  gift: Gift;
  rank: number;
  picked: boolean;      // 候補に入っているか
  disabled: boolean;    // 押せないか（3つ選んだあと、まだ選んでいない商品）
  onToggle: () => void; // ボタンを押したときに page.tsx に知らせる
  showPick: boolean;    // 「候補に入れる」を出すか（トップで「みんなで選ぶ」を押したあとだけ出す）
};

export default function ResultCard({ gift, rank, picked, disabled, onToggle, showPick }: Props) {
  return (
    <article className="card">
      <div style={{ position: "relative" }}>
        <ProductImage category={gift.category} sizes="(max-width: 960px) 50vw, 260px" />
        <span className="thumb-chip">{gift.category}</span>
      </div>
      <div className="card-body">
        {/* ショップ名は別の行に小さく。商品名は DB の product_name をそのまま出す */}
        <p className="brand">人気{rank}位・{gift.brand}</p>
        <h3 className="name">{gift.name}</h3>
        <div className="price-row">
          <p className="price">{gift.price.toLocaleString()}<small>円</small></p>
          <p className="meta"><span className="star" aria-hidden="true">★</span> {gift.rating}（{gift.reviewCount}件）</p>
        </div>
        {/* 押すと候補に入り、もう一度押すと外れる。3つ選んだあとは、ほかの商品は押せない */}
        {showPick && (
          <button
            type="button"
            className={`btn ${picked ? "btn-picked" : "btn-outline"}`}
            aria-pressed={picked}
            disabled={disabled}
            onClick={onToggle}
            style={{ marginTop: 6 }}
          >
            {picked && <CheckIcon />}
            {picked ? "候補に追加済み" : "候補に入れる"}
          </button>
        )}
      </div>
    </article>
  );
}
