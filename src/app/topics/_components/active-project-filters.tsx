"use client";

import { UiNav, UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";

import { topicsHref } from "@/app/topics/_lib/topics-query";
import type { ProjectView } from "@/app/topics/_lib/topics-query";
import type {
  AdminProjectReportFilter,
  AdminProjectTeamFilter,
} from "@/modules/team/application/list-admin-program-project-operations";

export function ActiveProjectFilters({ view = "active", programId, query, divisionId, divisions = [], hasUnassigned = false, teamStatus, reportStatus }: {
  view?: ProjectView;
  programId?: string;
  query: string;
  divisionId?: string | "UNASSIGNED";
  divisions?: Array<{ id: string; name: string }>;
  hasUnassigned?: boolean;
  teamStatus?: AdminProjectTeamFilter;
  reportStatus?: AdminProjectReportFilter;
}) {
  const router = useRouter();

  if (!programId || !divisions.length) return null;

  return (
    <UiSection aria-label="프로젝트 분과 필터" className="border-b border-[var(--line)] pt-5">
      <UiNav aria-label="프로젝트 분과" className="flex gap-2 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ id: "", name: "전체" }, ...divisions, ...(hasUnassigned ? [{ id: "UNASSIGNED", name: "미분과" }] : [])].map((division) => {
          const selected = (divisionId ?? "") === division.id;
          return <button key={division.id || "all"} type="button" onClick={() => router.push(topicsHref({ view, programId, q: query, divisionId: division.id || undefined, teamStatus, reportStatus }), { scroll: false })} aria-pressed={selected} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold ${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}><UiText>{division.name}</UiText></button>;
        })}
      </UiNav>
    </UiSection>
  );
}
