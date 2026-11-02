import { Pill, type PillTone } from "@/modules/project-program/ui/work-screen";

/*
  오프라인 심사 결과다. 상 이름은 관리자가 손으로 적는 자유 문자열이라 정해진 목록이 없다.
  그래서 이름에 든 낱말로 고른다. 위에서부터 먼저 맞는 것을 쓰므로 순서가 곧 규칙이다.
  "최우수상" 은 "우수" 도 품고 있어서 반드시 그보다 위에 있어야 한다.

  색은 파랑 사다리 두 단만 쓴다. 대상과 최우수상은 진한 단, 우수상과 장려상은 옅은 단.
  인기상은 심사가 아니라 표로 정해지는 상이라 회색으로 따로 둔다.
*/
const AWARD_TONE: Array<[RegExp, PillTone]> = [
  [/대상|최우수/, "strong"],
  [/우수|장려/, "accent"],
];

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
  // 상 이름은 심사 결과로 받은 값이라 번역하지 않는다("대상" 이 공지 대상으로 번역된다).
  // 문자열이 아닌 조각으로 넘기면 Pill 안의 UiText 가 손대지 않는다.
  return <Pill tone={AWARD_TONE.find(([pattern]) => pattern.test(award))?.[1] ?? "plain"}><>{award}</></Pill>;
}
