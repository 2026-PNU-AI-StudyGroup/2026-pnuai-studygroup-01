export function activeProjectsHref(input: {
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  query?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.programId) params.set("programId", input.programId);
  if (input.divisionId) params.set("divisionId", input.divisionId);
  if (input.query) params.set("q", input.query);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return `/topics?${params.toString()}`;
}
