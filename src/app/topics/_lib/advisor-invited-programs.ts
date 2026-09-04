/**
 * 자문위원에게는 불려 온 프로그램만 남긴다.
 *
 * 투표를 막는 것만으로는 부족하다. 심사와 상관없는 프로그램이 사이드바에 줄줄이 서 있으면
 * 외부 위원은 어디를 봐야 하는지부터 헤맨다. 목록 자체를 초대받은 것만 남겨 화면을 좁힌다.
 */
export function keepInvitedProgramsForAdvisor<T extends { id: string }>(
  programs: T[],
  role: string,
  invitedProgramIds: ReadonlySet<string>,
): T[] {
  if (role !== "ADVISOR") return programs;
  return programs.filter((program) => invitedProgramIds.has(program.id));
}
