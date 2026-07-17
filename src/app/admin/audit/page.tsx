import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ListAuditLogService, type AuditAction } from "@/modules/audit/application/list-audit-log";
import { PrismaAuditLogReader } from "@/modules/audit/infrastructure/prisma-audit-log-reader";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "감사 기록" };

const actionLabel: Record<AuditAction, string> = {
  PROFESSOR_ACCESS_GRANTED: "교수 권한 부여",
  PROFESSOR_ACCESS_REVOKED: "교수 권한 회수",
  USER_DEACTIVATED: "사용자 비활성화",
  USER_REACTIVATED: "사용자 재활성화",
  TEAM_CONFIRMED: "팀 확정",
  TEAM_CLOSED: "프로젝트 종료",
  REPORT_REQUIREMENT_SET: "보고서 요구 설정",
  REPORT_REQUIREMENT_REMOVED: "보고서 요구 해제",
  REPORT_APPROVED: "보고서 승인",
  REPORT_REVISION_REQUESTED: "보고서 수정 요청",
};
const dateTime = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const params = await searchParams;
  const page = Number(firstSearchParam(params.page) ?? "1");
  const data = await new ListAuditLogService(new PrismaAuditLogReader(prisma)).execute(actor, page);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/audit">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="운영 관리" title="감사 기록" description="권한, 사용자 접근, 팀 확정과 보고서 승인처럼 운영에 영향을 주는 변경을 행위자와 시각 기준으로 확인합니다." />
        <section aria-labelledby="audit-list-title"><div className="mb-4 flex items-center justify-between gap-4"><h2 id="audit-list-title" className="text-lg font-extrabold">최근 변경</h2><p className="muted text-sm">총 {data.total}건</p></div>
          {data.items.length === 0 ? <EmptyState title="기록된 변경이 없습니다" description="중요 운영 작업이 발생하면 변경 이력이 이곳에 남습니다." /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{data.items.map((entry) => <li key={entry.id} className="grid gap-3 py-5 md:grid-cols-[13rem_minmax(0,1fr)_12rem] md:items-center"><div><StatusBadge tone={entry.action.includes("REVOKED") || entry.action.includes("DEACTIVATED") || entry.action.includes("REVISION") ? "warning" : "neutral"}>{actionLabel[entry.action]}</StatusBadge></div><div><p className="font-bold">{entry.targetLabel}</p><p className="muted mt-1 text-sm">처리자 {entry.actorName}</p></div><time className="muted text-sm md:text-right" dateTime={entry.createdAt.toISOString()}>{dateTime.format(entry.createdAt)}</time></li>)}</ol>}
        </section>
        {data.totalPages > 1 ? <nav aria-label="감사 기록 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={`/admin/audit?page=${data.page - 1}`}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={`/admin/audit?page=${data.page + 1}`}>다음</Link> : null}</div></nav> : null}
      </main>
    </AppShell>
  );
}
