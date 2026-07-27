import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { ListAuditLogService, type AuditAction } from "@/modules/audit/application/list-audit-log";
import { PrismaAuditLogReader } from "@/modules/audit/infrastructure/prisma-audit-log-reader";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("감사 기록");
}

const actionLabel: Record<AuditAction, string> = {
  PROFESSOR_ACCESS_GRANTED: "교수 권한 부여",
  PROFESSOR_ACCESS_REVOKED: "교수 권한 회수",
  USER_DEACTIVATED: "사용자 비활성화",
  USER_REACTIVATED: "사용자 재활성화",
  TEAM_CONFIRMED: "팀 확정",
  TEAM_CLOSED: "프로젝트 종료",
  REPORT_REQUIREMENT_SET: "보고서 요구 설정",
  REPORT_REQUIREMENT_REMOVED: "보고서 일정 삭제",
  REPORT_APPROVED: "보고서 승인",
  REPORT_REVISION_REQUESTED: "보고서 수정 요청",
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
      <AdminWorkspace currentPath="/admin/audit" title="감사 기록" description="권한, 사용자 접근, 팀 확정과 보고서 승인처럼 운영에 영향을 주는 변경을 시간순으로 추적합니다.">
        <section aria-labelledby="audit-list-title"><div className="mb-4 flex items-center justify-between gap-4"><h2 id="audit-list-title" className="text-lg font-semibold"><UiText>{"최근 변경"}</UiText></h2><p className="muted text-sm"><UiText>{"총"}</UiText>{" "}{data.total}<UiText>{"건"}</UiText></p></div>
          {data.items.length === 0 ? <EmptyState title="아직 변경 기록이 없습니다" description="중요한 운영 변경은 자동으로 기록됩니다." /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{data.items.map((entry) => <li key={entry.id} className="grid gap-3 py-5 md:grid-cols-[13rem_minmax(0,1fr)_12rem] md:items-center"><div><StatusBadge tone={entry.action.includes("REVOKED") || entry.action.includes("DEACTIVATED") || entry.action.includes("REVISION") ? "warning" : "neutral"}>{actionLabel[entry.action]}</StatusBadge></div><div><p className="font-bold"><UiText>{entry.targetLabel}</UiText></p><p className="muted mt-1 text-sm"><UiText>{"처리자"}</UiText>{" "}{entry.actorName}</p></div><time className="muted text-sm md:text-right" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time></li>)}</ol>}
        </section>
        {data.totalPages > 1 ? <UiNav aria-label="감사 기록 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.page} / {data.totalPages} {" "}<UiText>{"페이지"}</UiText></span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={`/admin/audit?page=${data.page - 1}`}><UiText>{"이전"}</UiText></Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={`/admin/audit?page=${data.page + 1}`}><UiText>{"다음"}</UiText></Link> : null}</div></UiNav> : null}
      </AdminWorkspace>
    </AppShell>
  );
}
