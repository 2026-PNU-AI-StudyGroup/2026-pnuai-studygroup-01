"use client";

import { UiNav, UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";

import { ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ActiveProjectFilters({ phase, counts, programId, query, sort, divisionId, divisions = [], hasUnassigned = false }: {
  phase: PublicTopicPhase;
  counts: PublicTopicPage["counts"];
  programId?: string;
  query: string;
  sort: PublicTopicSort;
  divisionId?: string | "UNASSIGNED";
  divisions?: Array<{ id: string; name: string }>;
  hasUnassigned?: boolean;
}) {
  const router = useRouter();

  return (
    <UiSection aria-label="프로젝트 검색과 필터" className="pt-5">
      <ProjectSearchForm view="active" phase={phase} programId={programId} query={query} sort={sort} divisionId={divisionId} />

      <div className="flex flex-col gap-3 border-b border-[var(--line)] py-4 sm:flex-row sm:items-center sm:justify-between">
        <ProjectStatusNavigation phase={phase} counts={counts} programId={programId} query={query} sort={sort} divisionId={divisionId} />
        <label className="w-full shrink-0 sm:w-auto">
          <span className="sr-only"><UiText>{"프로젝트 정렬"}</UiText></span>
          <CustomSelect
            name="sort"
            ariaLabel="프로젝트 정렬"
            density="compact"
            value={sort}
            onValueChange={(nextSort) => router.push(activeProjectsHref({
              phase,
              programId,
              divisionId,
              query,
              sort: nextSort === "DEADLINE" ? "DEADLINE" : "LATEST",
            }), { scroll: false })}
            options={[
              { value: "LATEST", label: "최신순" },
              { value: "DEADLINE", label: "마감 임박순" },
            ]}
          />
        </label>
      </div>
      {programId && divisions.length ? <UiNav aria-label="프로젝트 분과" className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ id: "", name: "전체" }, ...divisions, ...(hasUnassigned ? [{ id: "UNASSIGNED", name: "미분과" }] : [])].map((division) => {
          const selected = (divisionId ?? "") === division.id;
          return <button key={division.id || "all"} type="button" onClick={() => router.push(activeProjectsHref({ phase, programId, query, sort, divisionId: division.id || undefined }), { scroll: false })} aria-pressed={selected} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold ${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}><UiText>{division.name}</UiText></button>;
        })}
      </UiNav> : null}
    </UiSection>
  );
}
