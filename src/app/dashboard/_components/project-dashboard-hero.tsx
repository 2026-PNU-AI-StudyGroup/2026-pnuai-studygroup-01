import Link from "next/link";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { UserRole } from "@/modules/identity/domain/user-role";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

function DashboardActions({ role }: { role: UserRole }) {
  if (role === "PROFESSOR") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/professor/applications" className="button-secondary">
          <UiText>{"지원 검토"}</UiText></Link>
        <Link href="/professor/topics" className="button-primary">
          <UiText>{"주제 관리"}</UiText></Link>
      </div>
    );
  }

  return (
    <Link
      href={role === "STUDENT" ? "/topics" : "/professor/topics"}
      className="button-primary"
    >
      <UiText>{role === "STUDENT" ? "새 프로젝트 찾기" : "주제 관리"}</UiText>
    </Link>
  );
}

export function ProjectDashboardHero({ role }: { role: UserRole }) {
  const title =
    role === "PROFESSOR"
      ? "지도 프로젝트"
      : role === "ADMIN"
        ? "전체 프로젝트"
        : "내 프로젝트";
  const description =
    role === "PROFESSOR"
      ? "지도 중인 프로젝트의 작업과 마일스톤을 확인합니다."
      : role === "ADMIN"
        ? "운영 중인 프로젝트의 작업과 마일스톤을 확인합니다."
        : "지원부터 진행, 완료까지 내 프로젝트 상태를 한곳에서 확인합니다.";

  return (
    <div id="project-dashboard-overview">
      <ExplorerHero
        title={<UiText>{title}</UiText>}
        description={<UiText>{description}</UiText>}
        mark={<UiText>{role === "STUDENT" ? "내" : role === "PROFESSOR" ? "지" : "전"}</UiText>}
        action={<DashboardActions role={role} />}
      />
    </div>
  );
}
