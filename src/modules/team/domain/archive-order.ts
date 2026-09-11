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

export type ArchiveOrderRow = {
  id: string;
  teamName: string;
  /** 행사에서 매긴 번호. 번호를 안 쓰는 프로그램은 null 이다. */
  teamNumber: number | null;
  award: string | null;
  programStartsAt: Date;
};

/** 번호를 매긴 팀이 먼저 서고, 번호가 없으면 이름 가나다순이다. */
function compareTeam(left: ArchiveOrderRow, right: ArchiveOrderRow): number {
  if (left.teamNumber !== null && right.teamNumber !== null) return left.teamNumber - right.teamNumber;
  if (left.teamNumber !== null) return -1;
  if (right.teamNumber !== null) return 1;
  return left.teamName.localeCompare(right.teamName, "ko");
}

export function orderArchivedTeamIds(rows: readonly ArchiveOrderRow[]): string[] {
  return [...rows]
    .sort((left, right) =>
      right.programStartsAt.getTime() - left.programStartsAt.getTime()
      || awardRank(left.award) - awardRank(right.award)
      || compareTeam(left, right)
      || left.id.localeCompare(right.id))
    .map(({ id }) => id);
}
