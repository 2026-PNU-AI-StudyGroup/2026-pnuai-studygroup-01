import Link from "next/link";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

type ProjectDashboardRole = Exclude<UserRole, "ADMIN">;

function DashboardActions({ role }: { role: ProjectDashboardRole }) {
  if (role === "PROFESSOR") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/professor/applications" className="button-secondary">
          <UiText>{"지원 검토"}</UiText></Link>
        <Link href="/professor/topics" className="button-primary">
          <UiText>{"프로젝트 관리"}</UiText></Link>
      </div>
    );
  }

  return (
    <Link
      href="/topics"
      className="button-primary"
    >
      <UiText>{"새 프로젝트 찾기"}</UiText>
    </Link>
  );
}

export function ProjectDashboardHero({ role }: { role: ProjectDashboardRole }) {
  const title =
    role === "PROFESSOR"
      ? "프로젝트 운영"
      : "내 프로젝트";
  const description =
    role === "PROFESSOR"
      ? "지도 중인 프로젝트의 일정과 제출 현황을 확인합니다."
      : "참여 프로젝트의 일정과 제출 현황을 확인합니다.";

  return (
    <div id="project-dashboard-overview">
      <ExplorerHero
        title={<UiText>{title}</UiText>}
        description={<UiText>{description}</UiText>}
        action={<DashboardActions role={role} />}
      />
    </div>
  );
}
