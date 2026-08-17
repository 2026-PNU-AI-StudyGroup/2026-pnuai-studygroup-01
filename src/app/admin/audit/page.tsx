import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AdminSection,
  AdminSectionEmpty,
  adminRecordListClassName,
  adminRecordRowClassName,
} from "@/app/_components/admin-section";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { ListAuditLogService, type AuditAction } from "@/modules/audit/application/list-audit-log";
import { PrismaAuditLogReader } from "@/modules/audit/infrastructure/prisma-audit-log-reader";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("관리 이력");
}

const actionLabel: Record<AuditAction, string> = {
  PROFESSOR_ACCESS_GRANTED: "교수 권한 부여",
  PROFESSOR_ACCESS_REVOKED: "교수 권한 회수",
  USER_DEACTIVATED: "사용자 비활성화",
  USER_REACTIVATED: "사용자 재활성화",
  ADMIN_ROLE_GRANTED: "관리자 권한 부여",
  ADMIN_ROLE_REVOKED: "관리자 권한 해제",
  TEAM_CONFIRMED: "팀 확정",
  TEAM_CLOSED: "프로젝트 종료",
  USER_WITHDRAWN: "계정 탈퇴",
  PROJECT_TEAM_CONFIRMED: "프로젝트 팀 확정",
  PROJECT_COMPLETED: "프로젝트 완료 (이전 정책)",
  PROJECT_CANCELED: "프로젝트 취소 (이전 정책)",
  PROJECT_RESTORED: "프로젝트 복구 (이전 정책)",
  PROJECT_REVIEW_REQUESTED: "프로젝트 재검토 요청",
  PROJECT_TEAM_MEMBER_LEFT: "프로젝트 팀원 탈퇴",
  PROJECT_TEAM_MEMBER_REMOVED: "프로젝트 팀원 제외",
  PROJECT_TEAM_LEADERSHIP_TRANSFERRED: "프로젝트 팀장 이전",
  PROJECT_TEAM_MEMBERSHIP_CORRECTED: "프로젝트 팀 명단 정정",
  PROGRAM_CLOSED: "프로그램 종료",
  REPORT_REQUIREMENT_SET: "보고서 요구 설정",
  REPORT_REQUIREMENT_REMOVED: "보고서 일정 삭제",
  REPORT_APPROVED: "보고서 승인",
  REPORT_REVISION_REQUESTED: "보고서 수정 요청",
  PROJECT_ASSISTANT_INVITED: "프로젝트 조교 초대",
  PROJECT_ASSISTANT_ACCEPTED: "프로젝트 조교 수락",
  PROJECT_ASSISTANT_REMOVED: "프로젝트 조교 권한 해제",
  TOPIC_CLOSED: "프로젝트 마감",
  TOPIC_RECRUITMENT_CLOSED: "프로젝트 모집 마감",
  PROGRAM_DIVISION_CREATED: "분과 추가",
  PROGRAM_DIVISION_UPDATED: "분과 변경",
  PROGRAM_DIVISION_DELETED: "분과 삭제",
  PROGRAM_VOTING_RESET: "프로그램 투표 초기화",
  PROGRAM_REPORT_DEFINITION_CREATED: "프로그램 보고서 추가",
  PROGRAM_REPORT_DEFINITION_UPDATED: "프로그램 보고서 변경",
  PROGRAM_REPORT_DEFINITION_ARCHIVED: "프로그램 보고서 보관",
  PROGRAM_REPORT_DEFINITION_DELETED: "프로그램 보고서 삭제",
  PROGRAM_RUBRIC_CREATED: "프로그램 채점표 추가",
  PROGRAM_RUBRIC_UPDATED: "프로그램 채점표 변경",
  PROGRAM_RUBRIC_ARCHIVED: "프로그램 채점표 삭제",
  PROGRAM_DIVISION_RUBRIC_MODE_CHANGED: "분과 채점표 모드 변경",
  ADVISOR_REGISTERED: "자문위원 등록",
  ADVISOR_TOKEN_ISSUED: "자문위원 초대 링크 발급",
  ADVISOR_TOKEN_REVOKED: "자문위원 초대 링크 회수",
  ADVISOR_TEAMS_ASSIGNED: "자문위원 팀 할당",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const params = await searchParams;
  const page = Number(firstSearchParam(params.page) ?? "1");
  const data = await new ListAuditLogService(new PrismaAuditLogReader(prisma)).execute(actor, page);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/audit">
      <AdminWorkspace currentPath="/admin/audit" title="관리 이력" description="권한, 사용자 접근, 팀 확정과 보고서 승인처럼 운영에 영향을 주는 변경을 시간순으로 확인합니다.">
        <AdminSection
          id="audit-list-title"
          title="최근 변경"
          meta={<><UiText>{"총"}</UiText>{" "}{data.total}<UiText>{"건"}</UiText></>}
        >
          {data.items.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState variant="section" title="아직 변경 기록이 없습니다" description="중요한 운영 변경은 자동으로 기록됩니다." />
            </AdminSectionEmpty>
          ) : (
            <ol className={adminRecordListClassName}>
              {data.items.map((entry) => (
                <li
                  key={entry.id}
                  className={`${adminRecordRowClassName} grid gap-4 xl:grid-cols-[13rem_minmax(18rem,1fr)_12rem] xl:items-center`}
                >
                  <div>
                    <StatusBadge tone={entry.action.includes("REVOKED") || entry.action.includes("DEACTIVATED") || entry.action.includes("REVISION") ? "warning" : "neutral"}>{actionLabel[entry.action]}</StatusBadge>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words font-bold"><UiText>{entry.targetLabel}</UiText></p>
                    <p className="muted mt-1 text-sm"><UiText>{"관리자"}</UiText>{" "}{entry.actorName}</p>
                  </div>
                  <time className="muted text-sm xl:text-right" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time>
                </li>
              ))}
            </ol>
          )}
          {data.totalPages > 1 ? (
            <UiNav aria-label="관리 이력 페이지" className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
              <span className="muted text-sm">{data.page} / {data.totalPages} {" "}<UiText>{"페이지"}</UiText></span>
              <div className="flex gap-2">
                {data.page > 1 ? <PaginationDirectionLink direction="previous" href={`/admin/audit?page=${data.page - 1}`} /> : null}
                {data.page < data.totalPages ? <PaginationDirectionLink direction="next" href={`/admin/audit?page=${data.page + 1}`} /> : null}
              </div>
            </UiNav>
          ) : null}
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}
