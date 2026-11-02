import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RetryEmailDeliveryForm } from "@/app/admin/emails/_components/retry-email-delivery-form";
import { AdminSidebar } from "@/app/_components/admin-sidebar";
import { AdminWorkspace, adminHeadRow, adminRow } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { emailDeliveryKindLabel, maskEmailAddress } from "@/modules/email/ui/email-delivery-presentation";
import { cardClass, CardHead, KpiStrip } from "@/modules/project-program/ui/work-screen";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("이메일 전송");
}

// 종류, 받는 사람과 오류, 시도, 마지막 시도, 작업.
const failureColumns = "@min-[48rem]:grid-cols-[8rem_minmax(0,1fr)_4rem_9rem_9.5rem]";

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
  const counts: Record<string, number> = Object.fromEntries(grouped.map(({ status, _count }) => [status, _count._all]));
  const count = (status: string) => counts[status] ?? 0;
  const queueCount = count("PENDING") + count("RETRY_WAIT") + count("PROCESSING");
  const waitMinutes = oldest ? Math.max(0, Math.floor((now.getTime() - oldest.createdAt.getTime()) / 60_000)) : null;
  // 한 시간이 넘게 기다린 메일이 있으면 발송 작업이 멈췄을 수 있다. 그때만 굵게 앞에 세운다.
  const stalled = waitMinutes !== null && waitMinutes >= 60;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/emails" crumbs={[{ label: "이메일 전송" }]} panel={<AdminSidebar currentPath="/admin/emails" />}>
      <AdminWorkspace
        title="이메일 전송"
        description={waitMinutes !== null
          ? <b className={`font-semibold ${stalled ? "text-[var(--danger)]" : ""}`}><UiText>{`가장 오래된 대기 메일이 ${formatAge(waitMinutes)}째 발송되지 않았습니다.`}</UiText></b>
          : <UiText>{"보낼 메일이 밀려 있지 않습니다."}</UiText>}
      >
        {/* 대기열의 상태 여섯 가지를 한 판에 나눠 담는다. 빨강은 실패가 있을 때 그 숫자에만. */}
        <KpiStrip items={[
          { label: "대기", value: count("PENDING"), unit: "건", note: oldest ? <><UiText>{"가장 오래된 것"}</UiText> <UiDate value={oldest.createdAt} mode="date" /></> : <UiText>{"밀린 메일 없음"}</UiText> },
          { label: "재시도 대기", value: count("RETRY_WAIT"), unit: "건" },
          { label: "처리 중", value: count("PROCESSING"), unit: "건", note: <UiText>{`대기열 합계 ${queueCount}건`}</UiText> },
          { label: "실패", value: count("FAILED"), unit: "건", alert: true },
          { label: "최근 24시간 발송", value: recentSuccess, unit: "건", note: <UiText>{`누적 발송 ${count("SENT")}건`}</UiText> },
          { label: "취소", value: count("CANCELED"), unit: "건" },
        ]} />
        <section aria-labelledby="failed-email-title" className={`${cardClass} @container`}>
          <CardHead id="failed-email-title" title={<UiText>{"실패한 작업"}</UiText>} count={<>{failures.length}<UiText>{"건"}</UiText>{failures.length === 50 ? <>{" "}<UiText>{"(최근 50건)"}</UiText></> : null}</>} />
          {failures.length === 0 ? (
            <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"실패한 이메일 작업이 없습니다. 실패하면 여기서 다시 대기열에 등록할 수 있습니다."}</UiText></p>
          ) : (
            <>
              <div aria-hidden="true" className={`${adminHeadRow} ${failureColumns}`}>
                <span><UiText>{"종류"}</UiText></span>
                <span><UiText>{"받는 사람, 오류"}</UiText></span>
                <span className="text-right"><UiText>{"시도"}</UiText></span>
                <span className="text-right"><UiText>{"마지막 시도"}</UiText></span>
                <span />
              </div>
              <ol>
                {failures.map((delivery) => (
                  <li key={delivery.id} className={`${adminRow} grid-cols-[minmax(0,1fr)_auto] text-[0.8125rem] ${failureColumns}`}>
                    <span className="text-[var(--ink)]"><UiText>{emailDeliveryKindLabel[delivery.kind]}</UiText></span>
                    <div className="col-span-2 min-w-0 @min-[48rem]:col-span-1">
                      <p className="truncate font-medium text-[var(--ink)]">{maskEmailAddress(delivery.recipientEmail)}</p>
                      <p className="mt-0.5 break-words text-xs text-[var(--muted)]">{delivery.lastError || <UiText>{"오류 정보가 없습니다."}</UiText>}</p>
                    </div>
                    <span className="tabular-nums text-[var(--muted)] @min-[48rem]:text-right"><UiText>{`${delivery.attempts}회`}</UiText></span>
                    <span className="tabular-nums text-[var(--muted)] @min-[48rem]:text-right"><UiDate value={delivery.updatedAt} mode="dateTime" /></span>
                    <div className="col-span-2 flex justify-end @min-[48rem]:col-span-1"><RetryEmailDeliveryForm id={delivery.id} /></div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </AdminWorkspace>
    </AppShell>
  );
}

function formatAge(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}시간 ${minutes % 60}분`;
  return `${Math.floor(hours / 24)}일 ${hours % 24}시간`;
}
