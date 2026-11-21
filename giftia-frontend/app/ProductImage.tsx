// app/ProductImage.tsx — 商品のサムネイル（部品）。カテゴリーごとのダミー画像を出す（デザインの Issue）
// 画像の大きさと形は、使う側が className で決める（正方形の枠に、切らずに収める）
import Image from "next/image";
import { categoryImage } from "@/lib/categoryImages";

type Props = {
  category: string | undefined; // 商品のカテゴリー（products.category）
  className?: string;           // 枠の大きさ（globals.css の .thumb-◯◯）
  sizes?: string;               // 画面の幅に対して、画像がどのくらいの幅で出るか（next/image に渡す）
};

export default function ProductImage({ category, className = "", sizes = "300px" }: Props) {
  const src = categoryImage(category);
  return (
    <div className={`thumb ${className}`}>
      {src ? (
        // 画像は 600px に縮めてあるので、そのまま配る（unoptimized）
        <Image src={src} alt={`${category}のイメージ`} fill sizes={sizes} unoptimized />
      ) : (
        <span className="thumb-empty" aria-hidden="true" />
      )}
    </div>
  );
}
