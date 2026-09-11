/**
 * 지난 프로젝트 목록의 차례.
 *
 * 결과 발표를 보는 자리다. 상을 받은 팀이 위에 오고 그 안에서는 팀 번호대로 선다.
 * 상이 없는 팀은 그 아래에 다시 번호대로 붙는다. 상을 아직 안 넣은 프로그램은 모두
 * 같은 순위가 되어 자연히 번호순 하나로 떨어진다.
 *
 * 프로그램은 따로 묶는다. 상 순위를 프로그램보다 앞에 두면 2022년 대상이 올해 장려상보다
 * 위로 올라온다. 한 행사 안에서만 상으로 줄을 세우는 것이 맞다.
 */

/**
 * 상 이름에서 순위를 읽는다.
 *
 * 상 이름은 자유 문자열이라 정해진 목록이 없다. 배지가 색을 고르는 규칙과 같은 낱말,
 * 같은 차례를 쓴다. 위에서부터 먼저 맞는 것을 쓰므로 "최우수" 가 "우수" 보다 앞에 있어야 한다.
 * 한 팀이 상을 둘 받아 가운뎃점으로 이어 적었으면 그중 가장 높은 상으로 친다.
 */
const AWARD_ORDER = [/대상/, /최우수/, /우수/, /장려/, /인기/] as const;

/** 목록에 없는 이름의 상. 상은 받았으니 무관 팀보다는 위에 둔다. */
const OTHER_AWARD_RANK = AWARD_ORDER.length;
/** 상이 없는 팀. 언제나 맨 아래다. */
const NO_AWARD_RANK = OTHER_AWARD_RANK + 1;

export function awardRank(award: string | null | undefined): number {
  const name = award?.trim();
  if (!name) return NO_AWARD_RANK;
  const found = AWARD_ORDER.findIndex((pattern) => pattern.test(name));
  return found === -1 ? OTHER_AWARD_RANK : found;
}

/**
 * 팀 이름 앞에 붙은 번호를 뽑는다.
 *
 * 번호를 담는 칸이 따로 없어 프로그램마다 이름 앞에 적어 왔다. `1. 404Found` 도 있고
 * `A-1. Broom` 도 있다. 글자로만 세우면 A-1, A-10, A-11, A-2 처럼 열 번대가 두 번째로
 * 끼어든다. 글자 부분과 숫자 부분을 갈라 숫자는 숫자로 센다.
 *
 * 번호가 없는 이름은 `null` 이다. 부르는 쪽이 이름 자체로 세운다.
 */
export function teamNumberKey(name: string): { group: string; number: number } | null {
  const matched = /^\s*([A-Za-z]*)[\s\-_.]*(\d+)\s*[.\-)]/.exec(name);
  if (!matched) return null;
  return { group: matched[1]!.toUpperCase(), number: Number(matched[2]) };
}

export type ArchiveOrderRow = {
  id: string;
  teamName: string;
  award: string | null;
  programStartsAt: Date;
};

/** 이름 하나를 비교한다. 번호가 있는 쪽이 먼저 서고, 번호가 없으면 가나다순이다. */
function compareTeamName(left: string, right: string): number {
  const leftKey = teamNumberKey(left);
  const rightKey = teamNumberKey(right);
  if (leftKey && rightKey) {
    return leftKey.group.localeCompare(rightKey.group) || leftKey.number - rightKey.number;
  }
  if (leftKey) return -1;
  if (rightKey) return 1;
  return left.localeCompare(right, "ko");
}

export function orderArchivedTeamIds(rows: readonly ArchiveOrderRow[]): string[] {
  return [...rows]
    .sort((left, right) =>
      right.programStartsAt.getTime() - left.programStartsAt.getTime()
      || awardRank(left.award) - awardRank(right.award)
      || compareTeamName(left.teamName, right.teamName)
      || left.id.localeCompare(right.id))
    .map(({ id }) => id);
}
