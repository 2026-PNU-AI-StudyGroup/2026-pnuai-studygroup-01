import Link from "next/link";

import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type {
  ProjectDashboardCounts,
  ProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";

export function ProjectDashboardSidebar({
  counts,
  selectedView,
  student,
}: {
  counts: ProjectDashboardCounts;
  selectedView: ProjectDashboardView;
  student: boolean;
}) {
  const items: Array<{
    view: ProjectDashboardView;
    label: string;
    count: number;
  }> = [
    {
      view: "all",
      label: "전체",
      count: counts.all,
    },
    {
      view: "active",
      label: "진행 중 프로젝트",
      count: counts.active,
    },
    ...(student ? [{
      view: "pending" as const,
      label: "승인 대기",
      count: counts.pending,
    }] : []),
    {
      view: "completed",
      label: "완료한 프로젝트",
      count: counts.completed,
    },
    ...(student ? [{
      view: "rejected" as const,
      label: "승인 거절",
      count: counts.rejected,
    }] : []),
  ];

  return (
    <div className="px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-3 lg:py-8">
      <div className="border-b border-[var(--line)] px-2 pb-5">
        <h2 className="text-sm font-bold tracking-[-0.02em] text-[var(--ink)]">
          <UiText>{"내 프로젝트"}</UiText>
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          <UiText>{student ? "지원부터 완료까지 한곳에서 확인합니다." : "프로젝트 작업 현황을 확인합니다."}</UiText>
        </p>
      </div>

      <UiNav aria-label="내 프로젝트 바로가기" className="mt-4">
        <ul className="space-y-1">
          {items.map((item, index) => {
            const labelId = `project-dashboard-label-${index}`;
            const countId = `project-dashboard-count-${index}`;
            const selected = item.view === selectedView;

            return (
              <li key={item.label}>
                <Link
                  href={item.view === "all" ? "/dashboard" : `/dashboard?view=${item.view}`}
                  aria-labelledby={`${labelId} ${countId}`}
                  aria-current={selected ? "page" : undefined}
                  className={`relative flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
                    selected
                      ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span id={labelId}><UiText>{item.label}</UiText></span>
                  <span id={countId} className="sr-only">{item.count}<UiText>{"개"}</UiText></span>
                  <span aria-hidden="true" className="min-w-7 rounded-full bg-white px-2 py-0.5 text-center text-[0.68rem] font-bold text-[var(--muted)]">
                    {item.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </UiNav>
    </div>
  );
}
