type SelectableProgram = { id: string };

/**
 * 프로그램을 고르지 않고 들어왔을 때 어느 프로그램을 열지 정한다.
 *
 * 예전에는 목록 첫 항목, 즉 가장 최근에 만든 프로그램을 열었다. 그래서 방금 만든
 * 프로그램이 계속 먼저 뜨고 지금 운영 중인 프로그램을 매번 다시 골라야 했다.
 * 사이드바에 보이는 순서를 그대로 따라 목록 맨 위 프로그램을 연다.
 */
export function resolveProgramSelection(
  requestedProgramId: string | undefined,
  programs: ReadonlyArray<SelectableProgram>,
  sidebarOrder: readonly string[] = [],
): string | undefined {
  if (requestedProgramId && programs.some(({ id }) => id === requestedProgramId)) {
    return requestedProgramId;
  }
  const firstVisible = sidebarOrder.find((id) => programs.some((program) => program.id === id));
  return firstVisible ?? programs[0]?.id;
}
