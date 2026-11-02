import Link from "next/link";

import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type {
  ProjectDashboardCounts,
  ProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";
import { ResponsiveSectionNavigation } from "@/shared/ui/responsive-section-navigation";
import { sidebarGroupLabelClass, sidebarRowClass } from "@/shared/ui/sidebar-row";

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
      label: "검토 중",
      count: counts.pending,
    }] : []),
    {
      view: "completed",
      label: "완료한 프로젝트",
      count: counts.completed,
    },
    ...(student ? [{
      view: "rejected" as const,
      label: "미선정",
      count: counts.rejected,
    }] : []),
  ];
  const selectedItem = items.find((item) => item.view === selectedView) ?? items[0];

  function navigationItems(surface: "mobile" | "desktop") {
    return items.map((item, index) => {
      const labelId = `project-dashboard-${surface}-label-${index}`;
      const countId = `project-dashboard-${surface}-count-${index}`;
      const selected = item.view === selectedView;

      return (
        <li key={`${surface}-${item.label}`}>
          <Link
            href={item.view === "all" ? "/dashboard" : `/dashboard?view=${item.view}`}
            aria-labelledby={`${labelId} ${countId}`}
            aria-current={selected ? "page" : undefined}
            className={`${sidebarRowClass(selected)} justify-between max-lg:min-h-11`}
          >
            <span id={labelId}><UiText>{item.label}</UiText></span>
            <span id={countId} className="sr-only">{item.count}<UiText>{"개"}</UiText></span>
            <span aria-hidden="true" className="min-w-7 rounded-full bg-[var(--surface)] px-2 py-0.5 text-center text-[0.68rem] font-bold text-[var(--muted)]">
              {item.count}
            </span>
          </Link>
        </li>
      );
    });
  }

  return (
    <div className="px-4 py-4 lg:p-0">
      <ResponsiveSectionNavigation
        eyebrow={<UiText>{student ? "내 프로젝트" : "프로젝트 운영"}</UiText>}
        label={<UiText>{selectedItem.label}</UiText>}
        meta={<>{selectedItem.count}<UiText>{"개"}</UiText></>}
      >
        <UiNav aria-label={student ? "내 프로젝트 바로가기 모바일" : "프로젝트 운영 바로가기 모바일"}>
          <ul className="space-y-1">{navigationItems("mobile")}</ul>
        </UiNav>
      </ResponsiveSectionNavigation>

      <div className="hidden lg:block">
        <h2 className={sidebarGroupLabelClass}>
          <UiText>{student ? "내 프로젝트" : "프로젝트 운영"}</UiText>
        </h2>

        <UiNav aria-label={student ? "내 프로젝트 바로가기" : "프로젝트 운영 바로가기"}>
          <ul className="space-y-0.5">{navigationItems("desktop")}</ul>
        </UiNav>
      </div>
    </div>
  );
}
