import { isProgramVotingOpen } from "@/modules/project-program/domain/project-program-policy";

type SelectableProgram = {
  id: string;
  startsAt?: Date;
  votingPolicy?: { startsAt: Date; endsAt: Date } | null;
};

/**
 * 프로그램을 고르지 않고 들어왔을 때 어느 프로그램을 열지 정한다.
 *
 * 예전에는 목록 첫 항목, 즉 가장 최근에 만든 프로그램을 열었다. 그래서 방금 만든
 * 프로그램이 계속 먼저 뜨고 지금 운영 중인 프로그램을 매번 다시 골라야 했다.
 * 투표 일정을 잡아 둔 프로그램을 먼저 연다. 그게 지금 운영 중인 프로그램이다.
 */
export function resolveProgramSelection(
  requestedProgramId: string | undefined,
  programs: ReadonlyArray<SelectableProgram>,
  now: Date = new Date(),
): string | undefined {
  if (requestedProgramId && programs.some(({ id }) => id === requestedProgramId)) {
    return requestedProgramId;
  }
  // 투표를 잡아 둔 프로그램이 지금 운영 중인 프로그램이다. 투표가 열렸으면 더 급하다.
  const rank = (program: SelectableProgram) => {
    if (isProgramVotingOpen(program.votingPolicy ?? null, now)) return 0;
    if (program.votingPolicy && program.votingPolicy.endsAt > now) return 1;
    return 2;
  };
  // 같은 순위 안에서는 늦게 시작한 프로그램이 최신이다.
  const ordered = [...programs].sort((left, right) => {
    const leftStart = left.startsAt?.getTime() ?? 0;
    const rightStart = right.startsAt?.getTime() ?? 0;
    return rank(left) - rank(right) || rightStart - leftStart;
  });
  return ordered[0]?.id;
}
