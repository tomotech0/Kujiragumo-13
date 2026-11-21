// app/Steps.tsx — 贈る人の画面（②③⑤）の上に出す3つのステップ（部品。デザインの Issue）
// 今いるステップを current（1〜3）で渡す。済んだステップにはチェックを出す

const STEPS = ["候補を選ぶ", "みんなに聞く", "ギフトを決める"];

export default function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="steps" aria-label="すすめかた">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "now" : "todo";
        return (
          <li key={label} className={`step step-${state}`} aria-current={state === "now" ? "step" : undefined}>
            <span className="step-num">
              {state === "done" ? (
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.4"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : n}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

// 賛成・候補に追加済みのボタンに付けるチェックの印（ほかの画面でも使う）
export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
