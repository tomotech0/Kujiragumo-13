// lib/categoryImages.ts — 商品のカテゴリー → サムネイル画像（デザインの Issue）
// 商品ごとの画像はないので、カテゴリーごとのダミー画像を出す。画像は public/images/categories/ に置く。
// カテゴリーと画像の対応は、ここ1か所にだけ書く（DB の products.category の値と同じ文字にする）。

const IMAGES: Record<string, string> = {
  生活雑貨: "/images/categories/zakka.jpeg",
  食品: "/images/categories/food.jpeg",
  コスメ: "/images/categories/cosme.jpeg",
  飲料: "/images/categories/drink.jpeg",
  家電: "/images/categories/appliance.jpeg",
  インテリア: "/images/categories/interior.jpeg",
  ビジネス小物: "/images/categories/business.jpeg",
  フラワー: "/images/categories/flower.jpeg",
  酒類: "/images/categories/liquor.jpeg",
  カタログギフト: "/images/categories/catalog.jpeg",
};

// カテゴリーの画像の場所。対応する画像がなければ null（画面は無地の枠を出す）
export const categoryImage = (category: string | undefined): string | null =>
  (category && IMAGES[category]) || null;
