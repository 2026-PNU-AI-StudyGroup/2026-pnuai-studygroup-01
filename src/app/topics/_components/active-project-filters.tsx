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
    <UiSection aria-label="프로젝트 분과 필터" className="px-5">
      {/* 분과는 밑줄 탭으로 고른다. 탭은 표 위 1px 선에 얹히고, 고른 탭만 2px 파랑 줄을 단다. */}
      <UiNav aria-label="프로젝트 분과" className="-mb-px flex gap-5 overflow-x-auto border-b border-[var(--line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ id: "", name: "전체" }, ...divisions, ...(hasUnassigned ? [{ id: "UNASSIGNED", name: "미분과" }] : [])].map((division) => {
          const selected = (divisionId ?? "") === division.id;
          return <button key={division.id || "all"} type="button" onClick={() => router.push(topicsHref({ view, programId, q: query, divisionId: division.id || undefined, teamStatus, reportStatus }), { scroll: false })} aria-pressed={selected} className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-2 text-[0.8125rem] font-medium transition-colors ${selected ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><UiText>{division.name}</UiText></button>;
        })}
      </UiNav>
    </UiSection>
  );
}
