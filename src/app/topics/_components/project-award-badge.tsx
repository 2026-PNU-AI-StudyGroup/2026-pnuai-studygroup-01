// 오프라인 심사 결과다. 대상·최우수상은 금색, 나머지는 은색 계열로 눈에 띄게 둔다.
const AWARD_TONE: Array<[RegExp, string]> = [
  [/대상|최우수/, "border-[#c99700]/50 bg-[#f5c518] text-[#3a2a00]"],
  [/우수/, "border-white/30 bg-[#d7dbe4] text-[#2b3040]"],
];

const FALLBACK_TONE = "border-white/25 bg-[rgba(31,35,48,.88)] text-white";

export function ProjectAwardBadge({ award }: { award: string }) {
  const tone = AWARD_TONE.find(([pattern]) => pattern.test(award))?.[1] ?? FALLBACK_TONE;
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-[-0.01em] backdrop-blur-sm ${tone}`}>
      <TrophyIcon className="size-3.5 shrink-0" />
      {/* 상 이름은 심사 결과로 받은 값이다. 팀명처럼 번역하지 않는다("대상" 이 공지 대상으로 번역된다). */}
      {award}
    </span>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round] ${className ?? ""}`}>
      <path d="M4.5 2h7v3.5a3.5 3.5 0 0 1-7 0V2Z" />
      <path d="M4.5 3H2.5v1a2.5 2.5 0 0 0 2 2.45M11.5 3h2v1a2.5 2.5 0 0 1-2 2.45M8 9v2.5M5.5 14h5l-.5-2.5h-4L5.5 14Z" />
    </svg>
  );
}
