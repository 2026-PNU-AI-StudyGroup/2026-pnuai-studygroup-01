import Link from "next/link";

import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import type {
  AdminProjectOperationFilter,
  AdminProgramProjectOperations,
} from "@/modules/team/application/list-admin-program-project-operations";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav, UiSection } from "@/modules/translation/ui/localized-elements";

const summaryCards: Array<{
  filter: AdminProjectOperationFilter;
  label: string;
  count: keyof AdminProgramProjectOperations["summary"];
}> = [
  { filter: "all", label: "전체", count: "total" },
  { filter: "operating", label: "운영 팀", count: "operating" },
  { filter: "unassigned", label: "팀 미구성", count: "unassigned" },
  { filter: "overdue", label: "기한 초과", count: "overdue" },
  { filter: "submitted", label: "제출 완료", count: "submitted" },
];

export function AdminProjectOperationsSummary({
  programId,
  operations,
  selectedFilter,
  divisionId,
  query,
}: {
  programId: string;
  operations: AdminProgramProjectOperations;
  selectedFilter: AdminProjectOperationFilter;
  divisionId?: string | "UNASSIGNED";
  query: string;
}) {
  return (
    <UiSection aria-labelledby="admin-project-operations-title" className="pt-5">
      <h2 id="admin-project-operations-title" className="sr-only"><UiText>{"운영 상태"}</UiText></h2>
      <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span aria-hidden="true" className="shrink-0 text-xs font-bold text-[var(--muted)]"><UiText>{"운영 상태"}</UiText></span>
        <UiNav aria-label="프로젝트 운영 상태" className="flex shrink-0 gap-2">
          {summaryCards.map((card) => {
            const selected = selectedFilter === card.filter;
            const count = operations.summary[card.count];
            return (
              <Link
                key={card.filter}
                href={activeProjectsHref({
                  programId,
                  divisionId,
                  query,
                  operation: card.filter,
                })}
                aria-current={selected ? "page" : undefined}
                aria-label={`${card.label} ${count}개`}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${selected
                  ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                  : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"}`}
              >
                <UiText>{card.label}</UiText>
                <strong className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-4 ${selected ? "bg-white text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--ink)]"}`}>{count}</strong>
              </Link>
            );
          })}
        </UiNav>
      </div>
    </UiSection>
  );
}
