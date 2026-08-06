export function resolveProgramSelection(
  requestedProgramId: string | undefined,
  programs: ReadonlyArray<{ id: string }>,
): string | undefined {
  if (requestedProgramId && programs.some(({ id }) => id === requestedProgramId)) {
    return requestedProgramId;
  }
  return programs[0]?.id;
}
