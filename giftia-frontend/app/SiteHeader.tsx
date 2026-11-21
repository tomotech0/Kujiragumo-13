// app/SiteHeader.tsx — 全部の画面の上に出すヘッダー（部品）。layout.tsx から1回だけ出す（デザインの Issue）
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="logo">
          {/* リボンをかけた箱の線画 */}
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" />
            <path d="M2.5 9h19" />
            <path d="M12 9v11.5" />
            <path d="M12 9c-1.6-3.2-5.4-4-5.4-1.6 0 1.6 2.6 1.6 5.4 1.6z" />
            <path d="M12 9c1.6-3.2 5.4-4 5.4-1.6 0 1.6-2.6 1.6-5.4 1.6z" />
          </svg>
          Giftia
        </Link>
        <span className="tagline">みんなで選ぶ</span>
      </div>
    </header>
  );
}
