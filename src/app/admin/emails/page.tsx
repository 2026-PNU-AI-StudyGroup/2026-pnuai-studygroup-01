import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RetryEmailDeliveryForm } from "@/app/admin/emails/_components/retry-email-delivery-form";
import { AdminSection, AdminSectionEmpty, adminRecordListClassName, adminRecordRowClassName } from "@/app/_components/admin-section";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { emailDeliveryKindLabel, emailDeliveryStatusLabel, maskEmailAddress } from "@/modules/email/ui/email-delivery-presentation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("이메일 전송");
}

export default async function EmailDeliveryAdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const now = new Date();
  const recent = new Date(now.getTime() - 24 * 60 * 60_000);
  const [grouped, oldest, recentSuccess, failures] = await Promise.all([
    prisma.emailDelivery.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emailDelivery.findFirst({
      where: { status: { in: ["PENDING", "RETRY_WAIT"] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.emailDelivery.count({ where: { status: "SENT", sentAt: { gte: recent } } }),
    prisma.emailDelivery.findMany({
      where: { status: "FAILED" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { id: true, kind: true, recipientEmail: true, attempts: true, lastError: true, updatedAt: true },
    }),
  ]);
  const counts = Object.fromEntries(grouped.map(({ status, _count }) => [status, _count._all]));
  const queueCount = (counts.PENDING ?? 0) + (counts.RETRY_WAIT ?? 0) + (counts.PROCESSING ?? 0);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/emails">
      <AdminWorkspace currentPath="/admin/emails" title="이메일 전송">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="대기·처리" value={queueCount} />
          <Metric label="실패" value={counts.FAILED ?? 0} tone="danger" />
          <Metric label="최근 24시간 성공" value={recentSuccess} tone="success" />
          <Metric label="가장 오래된 대기" value={oldest ? formatAge(now.getTime() - oldest.createdAt.getTime()) : "없음"} />
        </section>
        <AdminSection id="email-status-title" title="상태별 작업">
          <ul className="grid divide-y divide-[var(--line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {Object.entries(emailDeliveryStatusLabel).map(([status, label]) => <li key={status} className="flex items-center justify-between gap-3 px-5 py-4"><StatusBadge tone={status === "FAILED" ? "danger" : status === "SENT" ? "success" : status === "RETRY_WAIT" ? "warning" : "neutral"}><UiText>{label}</UiText></StatusBadge><strong>{counts[status] ?? 0}</strong></li>)}
          </ul>
        </AdminSection>
        <AdminSection id="failed-email-title" title="실패한 작업">
          {failures.length === 0 ? <AdminSectionEmpty><EmptyState variant="section" title="실패한 이메일 작업이 없습니다" /></AdminSectionEmpty> : (
            <ol className={adminRecordListClassName}>
              {failures.map((delivery) => <li key={delivery.id} className={`${adminRecordRowClassName} grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><StatusBadge tone="danger"><UiText>{emailDeliveryKindLabel[delivery.kind]}</UiText></StatusBadge><span className="text-sm font-semibold text-[var(--muted)]"><UiText>{`시도 ${delivery.attempts}회`}</UiText></span></div>
                  <p className="mt-2 break-all text-sm font-semibold">{maskEmailAddress(delivery.recipientEmail)}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-[var(--muted)]">{delivery.lastError || "오류 정보가 없습니다."}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]"><UiDate value={delivery.updatedAt} mode="dateTime" /></p>
                </div>
                <RetryEmailDeliveryForm id={delivery.id} />
              </li>)}
            </ol>
          )}
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "danger" }) {
  return <div className="admin-panel p-5"><p className="text-sm font-semibold text-[var(--muted)]"><UiText>{label}</UiText></p><p className={`mt-2 text-2xl font-bold tracking-[-0.03em] ${tone === "danger" ? "text-[var(--danger)]" : tone === "success" ? "text-[var(--success)]" : "text-[var(--ink)]"}`}>{value}</p></div>;
}

function formatAge(milliseconds: number) {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}
