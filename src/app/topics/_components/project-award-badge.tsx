/*
  오프라인 심사 결과다. 상 이름은 관리자가 손으로 적는 자유 문자열이라 정해진 목록이 없다.
  그래서 이름에 든 낱말로 고른다. 위에서부터 먼저 맞는 것을 쓰므로 순서가 곧 규칙이다.
  "최우수상" 은 "우수" 도 품고 있어서 반드시 그보다 위에 있어야 한다.

  등수는 금·은·동 차례로 읽히게 두고, 대상만 여기서 한 단 더 올린다. 같은 금색으로
  두면 최우수상과 구별되지 않는다. 인기상은 심사가 아니라 표로 정해지는 상이라
  금속 계열에서 빼내 따로 둔다.

  카드 사진 위에 얹히는 일이 많아 토큰 대신 값을 박는다. 배경이 무엇이든 같게 보여야 한다.
*/
const AWARD_TONE: Array<[RegExp, string]> = [
  // 대상. 금색에 결을 넣고 옅은 빛을 둘러 한눈에 제일 위로 보이게 한다.
  [/대상/, "border-[#b8860b]/60 bg-[linear-gradient(135deg,#ffe98a_0%,#f5c518_45%,#e0900b_100%)] text-[#3a2a00] shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_2px_10px_rgba(224,144,11,.45)]"],
  [/최우수/, "border-[#c99700]/50 bg-[#f5c518] text-[#3a2a00]"],
  // 테두리는 제 색보다 어두운 쪽으로 잡는다. 흰 테두리는 밝은 배경에서 사라져 알약이 뭉개진다.
  [/우수/, "border-[#9aa3b5]/50 bg-[#d7dbe4] text-[#2b3040]"],
  [/장려/, "border-[#8c5a2b]/50 bg-[#dda15e] text-[#3f2a12]"],
  [/인기/, "border-[#be185d]/40 bg-[#fbcfe0] text-[#9d174d]"],
];

const FALLBACK_TONE = "border-white/25 bg-[rgba(31,35,48,.88)] text-white";

/*
  한 팀이 상을 둘 받는 일이 있다. 인기상은 표로 정해지는 상이라 등수 상과 겹쳐서 받는다.
  그런데 수상 내역은 한 칸짜리 문자열이고, 옮겨 온 자료도 import-opus-archive 가
  "대상 · 인기상" 처럼 이어 붙여 넣는다. 통째로 한 알약에 담으면 두 번째 상이 묻힌다.
  가운뎃점이나 쉼표로 끊어 낱개로 그린다. 상마다 제 색을 받는다.
*/
const AWARD_SEPARATOR = /\s*[·,]\s*/;

export function ProjectAwardBadge({ award }: { award: string }) {
  const awards = award.split(AWARD_SEPARATOR).map((name) => name.trim()).filter(Boolean);
  if (awards.length === 0) return null;
  return <>{awards.map((name) => <AwardPill key={name} award={name} />)}</>;
}

function AwardPill({ award }: { award: string }) {
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
