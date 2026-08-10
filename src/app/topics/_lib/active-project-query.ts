import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

export function activeProjectsHref(input: {
  phase: PublicTopicPhase;
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  query?: string;
  sort?: PublicTopicSort;
  page?: number;
}) {
  const params = new URLSearchParams({ phase: input.phase });
  if (input.programId) params.set("programId", input.programId);
  if (input.divisionId) params.set("divisionId", input.divisionId);
  if (input.query) params.set("q", input.query);
  if (input.sort === "DEADLINE") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return `/topics?${params.toString()}`;
}
