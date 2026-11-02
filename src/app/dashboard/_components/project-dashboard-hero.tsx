import Link from "next/link";
import type { ReactNode } from "react";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { DocumentIcon, ProjectIcon } from "@/shared/ui/workspace-icons";

type ProjectDashboardRole = Exclude<UserRole, "ADMIN">;

function DashboardActions({ role, primaryAction }: { role: ProjectDashboardRole; primaryAction?: ReactNode }) {
  if (role === "PROFESSOR") {
    return (
      <>
        <Link href="/professor/applications" className="button-secondary button-compact gap-1.5">
          <DocumentIcon className="size-4 shrink-0" /><UiText>{"지원 검토"}</UiText></Link>
        <Link href="/professor/topics" className="button-primary button-compact gap-1.5">
          <ProjectIcon className="size-4 shrink-0" /><UiText>{"프로젝트 관리"}</UiText></Link>
      </>
    );
  }

  return (
    <>
      <Link href="/topics" className={`${primaryAction ? "button-secondary" : "button-primary"} button-compact`}>
        <UiText>{"새 프로젝트 찾기"}</UiText>
      </Link>
      {primaryAction}
    </>
  );
}

/**
 * 내 프로젝트 화면의 제목 줄. 제목 아래에 데이터에서 뽑은 한 줄(가장 가까운 마감)을 두고,
 * 그 마감에 맞는 할 일을 오른쪽 채운 버튼으로 건다.
 */
export function ProjectDashboardHero({ role, finding, primaryAction }: {
  role: ProjectDashboardRole;
  finding?: ReactNode;
  primaryAction?: ReactNode;
}) {
  return (
    <section id="project-dashboard-overview" aria-labelledby="project-dashboard-title" className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 id="project-dashboard-title" className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)]">
          <UiText>{role === "PROFESSOR" ? "지도 현황" : "내 프로젝트"}</UiText>
        </h1>
        {finding ? <p className="mt-1.5 text-sm text-[var(--ink)]">{finding}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <DashboardActions role={role} primaryAction={primaryAction} />
      </div>
    </section>
  );
}
