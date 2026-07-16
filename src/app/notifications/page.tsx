import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { markAllNotificationsReadAction, openNotificationAction } from "@/app/notifications/actions";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { NotificationService } from "@/modules/notification/application/manage-notifications";
import type { NotificationType } from "@/modules/notification/domain/notification";
import { PrismaNotificationRepository } from "@/modules/notification/infrastructure/prisma-notification-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "알림" };

const dateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const typeLabel: Record<NotificationType, string> = {
  APPLICATION_RESULT: "지원 결과",
  REPORT_ACTIVITY: "보고서",
  DEADLINE: "마감",
  SYSTEM: "안내",
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new NotificationService(new PrismaNotificationRepository(prisma)).list(actor.id, requestedPage);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/notifications">
      <main className="content-shell space-y-10">
        <PageHeader
          eyebrow="알림"
          title="알림함"
          description="지원 결과, 보고서 처리와 프로젝트 마감을 놓치지 않도록 필요한 소식만 모아 보여드립니다."
          actions={data.unreadCount ? <form action={markAllNotificationsReadAction}><button className="button-secondary">모두 읽음으로 표시</button></form> : undefined}
        />
        <section aria-labelledby="notification-list-title">
          <div className="mb-4 flex items-center justify-between gap-4"><h2 id="notification-list-title" className="text-lg font-extrabold">최근 알림</h2><p className="muted text-sm">읽지 않음 {data.unreadCount}개 · 전체 {data.total}개</p></div>
          {data.items.length === 0 ? <EmptyState title="새로운 알림이 없습니다" description="지원 결과나 마감 일정처럼 확인할 소식이 생기면 이곳에 표시됩니다." /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{data.items.map((notification) => <li key={notification.id} className={notification.readAt ? "py-6" : "border-l-2 border-l-[var(--accent)] py-6 pl-4 sm:pl-6"}>
            <form action={openNotificationAction} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <input type="hidden" name="notificationId" value={notification.id} />
              <div><div className="flex flex-wrap items-center gap-3"><StatusBadge tone={notification.readAt ? "neutral" : "info"}>{typeLabel[notification.type]}</StatusBadge>{!notification.readAt ? <span className="text-xs font-bold text-[var(--accent)]">새 알림</span> : null}</div><h3 className="mt-3 text-lg font-extrabold">{notification.title}</h3><p className="muted mt-2 max-w-3xl text-sm leading-6">{notification.body}</p><time className="muted mt-3 block text-xs" dateTime={notification.createdAt.toISOString()}>{dateTime.format(notification.createdAt)}</time></div>
              <button className="button-quiet justify-self-start sm:justify-self-end">{notification.readAt ? "다시 보기" : "확인하기"}<span aria-hidden="true" className="ml-2">→</span></button>
            </form>
          </li>)}</ol>}
        </section>
        {data.totalPages > 1 ? <nav aria-label="알림 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={`/notifications?page=${data.page - 1}`}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={`/notifications?page=${data.page + 1}`}>다음</Link> : null}</div></nav> : null}
      </main>
    </AppShell>
  );
}
