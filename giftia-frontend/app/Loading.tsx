// app/Loading.tsx — 待っている間の表示（部品）。画面の中央に、くるくると文言を出す（デザインの Issue）
// 検索中（②）と、③④⑤を開いたときの読み込み中で使い回す
// fullPage：画面にこれしか出ていないとき（③④⑤の読み込み中）は、画面の高さの中央に出す
export default function Loading({ text, fullPage = false }: { text: string; fullPage?: boolean }) {
  return (
    // role="status"：読み上げソフトにも「読み込み中」と伝える
    <div className={fullPage ? "loading loading-full" : "loading"} role="status">
      <span className="spinner spinner-large" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
