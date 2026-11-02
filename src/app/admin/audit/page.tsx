import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/app/_components/admin-sidebar";
import { AdminPager, AdminWorkspace, adminHeadRow, adminRow } from "@/app/_components/admin-workspace";
import { ListAuditLogService, type AuditAction } from "@/modules/audit/application/list-audit-log";
import { PrismaAuditLogReader } from "@/modules/audit/infrastructure/prisma-audit-log-reader";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { cardClass, CardHead, Pill } from "@/modules/project-program/ui/work-screen";
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
  TOPIC_APPROVAL_APPROVED: "프로젝트 등록 승인",
  TOPIC_APPROVAL_REJECTED: "프로젝트 등록 반려",
  TOPIC_DELETED: "프로젝트 삭제",
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

// 권한을 거두거나 막은 변경만 노란 알약. 나머지는 회색이다.
function actionTone(action: AuditAction) {
  return action.includes("REVOKED") || action.includes("DEACTIVATED") || action.includes("REVISION") || action.includes("REJECTED") ? "warning" as const : "plain" as const;
}

// 일시, 변경, 대상과 사유, 처리자. 좁으면 앞 칸 아래 회색 한 줄로 흐른다.
const columns = "@min-[48rem]:grid-cols-[9.5rem_11rem_minmax(0,1fr)_7rem]";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const params = await searchParams;
  const page = Number(firstSearchParam(params.page) ?? "1");
  const data = await new ListAuditLogService(new PrismaAuditLogReader(prisma)).execute(actor, page);
  const latest = data.page === 1 ? data.items[0] : undefined;
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/audit" crumbs={[{ label: "관리 이력" }]} panel={<AdminSidebar currentPath="/admin/audit" />}>
      <AdminWorkspace
        title="관리 이력"
        description={latest ? <><UiText>{"마지막 변경"}</UiText>{": "}<span className="tabular-nums"><UiDate value={latest.createdAt} mode="dateTime" /></span>, <UiText>{actionLabel[latest.action]}</UiText>, <UiText>{"처리자"}</UiText>{" "}{latest.actorName}.</> : undefined}
      >
        <section aria-labelledby="audit-list-title" className={`${cardClass} @container`}>
          <CardHead id="audit-list-title" title={<UiText>{"운영 변경 기록"}</UiText>} count={<>{data.total.toLocaleString("ko-KR")}<UiText>{"건"}</UiText></>} />
          {data.items.length === 0 ? (
            <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"아직 변경 기록이 없습니다. 권한, 사용자, 팀 확정, 보고서 승인 같은 운영 변경은 자동으로 기록됩니다."}</UiText></p>
          ) : (
            <>
              <div aria-hidden="true" className={`${adminHeadRow} ${columns}`}>
                <span><UiText>{"일시"}</UiText></span>
                <span><UiText>{"변경"}</UiText></span>
                <span><UiText>{"대상"}</UiText></span>
                <span><UiText>{"처리자"}</UiText></span>
              </div>
              <ol>
                {data.items.map((entry) => (
                  <li key={entry.id} className={`${adminRow} grid-cols-[minmax(0,1fr)_auto] text-[0.8125rem] ${columns}`}>
                    <time className="tabular-nums text-[var(--muted)]" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time>
                    <span className="justify-self-end @min-[48rem]:justify-self-start"><Pill tone={actionTone(entry.action)}>{actionLabel[entry.action]}</Pill></span>
                    <div className="col-span-2 min-w-0 @min-[48rem]:col-span-1">
                      <p className="break-words text-sm font-medium text-[var(--ink)]"><UiText>{entry.targetLabel}</UiText></p>
                      {entry.reason ? (
                        <p className="mt-0.5 break-words text-xs text-[var(--muted)]"><UiText>{"사유"}</UiText>{" "}<span className="text-[var(--ink)]">{entry.reason}</span></p>
                      ) : null}
                    </div>
                    <span className="col-span-2 truncate text-[var(--muted)] @min-[48rem]:col-span-1 @min-[48rem]:text-[var(--ink)]">{entry.actorName}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <AdminPager label="관리 이력 페이지" page={data.page} totalPages={data.totalPages} pageSize={50} total={data.total} href={(next) => `/admin/audit?page=${next}`} />
        </section>
      </AdminWorkspace>
    </AppShell>
  );
}
