import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { NotificationPage } from "@/modules/notification/application/notification-ports";
import type { NotificationType } from "@/modules/notification/domain/notification";
import {
  BellIcon,
  CheckIcon,
  ChevronIcon,
  ProfileIcon,
} from "@/shared/ui/workspace-icons";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { EmptyState } from "@/shared/ui/page-primitives";
const typeLabel: Record<NotificationType, string> = {
  APPLICATION_RESULT: "지원 결과",
  REPORT_ACTIVITY: "보고서",
  PROJECT_REQUEST: "회의·검토",
  DISCUSSION: "팀 대화",
  TOPIC_APPROVAL: "프로젝트 등록",
  DEADLINE: "마감",
  SYSTEM: "안내",
};
const typeIcon = {
  APPLICATION_RESULT: CheckIcon,
  REPORT_ACTIVITY: ProfileIcon,
  PROJECT_REQUEST: ProfileIcon,
  DISCUSSION: ProfileIcon,
  TOPIC_APPROVAL: CheckIcon,
  DEADLINE: BellIcon,
  SYSTEM: BellIcon,
} satisfies Record<NotificationType, typeof BellIcon>;

export function NotificationCenter({
  data,
  openNotification,
  markAllRead,
}: {
  data: NotificationPage;
  openNotification: (formData: FormData) => void | Promise<void>;
  markAllRead: () => void | Promise<void>;
}) {
  return (
    <main className="w-full px-5 py-8 pb-24 sm:px-8 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--line)] pb-6">
        <h1 className="text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold leading-tight tracking-[-0.02em]"><UiText>{"알림"}</UiText></h1>
      </header>
      <div className="pt-8">
        <section aria-labelledby="notification-list-title">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-7">
            <div>
              <h2 id="notification-list-title" className="text-lg font-semibold"><UiText>{"최근 활동"}</UiText></h2>
              <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">
                <UiText>{"전체"}</UiText>{" "}{data.total}<UiText>{"개"}</UiText>{data.unreadCount ? <span className="ml-3 font-semibold text-[var(--accent)]"><UiText>{"읽지 않음"}</UiText>{" "}{data.unreadCount}<UiText>{"개"}</UiText></span> : null}
              </p>
            </div>
            {data.unreadCount ? (
              <form action={markAllRead}>
                <button className="button-secondary gap-2"><CheckIcon className="size-4 shrink-0" /><UiText>{"모두 읽음으로 표시"}</UiText></button>
              </form>
            ) : null}
          </div>

          {data.items.length === 0 ? (
            <div className="border-b border-[var(--line)]">
              <EmptyState variant="section" title="새로운 알림이 없습니다" description="새 활동이 생기면 이 목록에 표시됩니다." />
            </div>
          ) : (
            <ol className="relative before:absolute before:bottom-7 before:left-[11px] before:top-7 before:w-px before:bg-[var(--line)]">
              {data.items.map((notification) => {
                const Icon = typeIcon[notification.type];
                return (
                  <li key={notification.id} className="relative border-b border-[var(--line)]">
                    <form action={openNotification}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button
                        type="submit"
                        className="record-row group grid w-full grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 py-6 text-left sm:grid-cols-[1.5rem_7.5rem_minmax(0,1fr)_4.5rem] sm:items-start sm:gap-x-5"
                      >
                        <span
                          aria-hidden="true"
                          className={`relative z-10 grid size-6 place-items-center rounded-full border ${
                            notification.readAt
                              ? "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)]"
                              : "border-[var(--accent-track)] bg-[var(--accent-subtle)] text-[var(--accent-ink)]"
                          }`}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="hidden pt-0.5 sm:block">
                          <span className={`block text-xs font-medium ${notification.readAt ? "text-[var(--muted)]" : "text-[var(--accent)]"}`}>
                            {typeLabel[notification.type]}
                          </span>
                          <time className="mt-2 block text-[11px] leading-4 tabular-nums text-[var(--muted)]" dateTime={notification.createdAt.toISOString()}>
                            <UiDate value={notification.createdAt} mode="dateTime" />
                          </time>
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 sm:hidden">
                            <span className={`text-xs font-medium ${notification.readAt ? "text-[var(--muted)]" : "text-[var(--accent)]"}`}>
                              {typeLabel[notification.type]}
                            </span>
                            {!notification.readAt ? <span className="size-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" /> : null}
                          </span>
                          <span role="heading" aria-level={3} className="mt-2 block text-[15px] font-semibold leading-6 sm:mt-0"><UiText>{notification.title}</UiText></span>
                          {!notification.readAt ? <span className="sr-only"><UiText>{"읽지 않은 알림"}</UiText></span> : null}
                          <span className="mt-1.5 block max-w-2xl text-sm leading-6 text-[var(--muted)]"><UiText>{notification.body}</UiText></span>
                          <time className="mt-2 block text-[11px] tabular-nums text-[var(--muted)] sm:hidden" dateTime={notification.createdAt.toISOString()}>
                            <UiDate value={notification.createdAt} mode="dateTime" />
                          </time>
                        </span>
                        <span className="col-start-2 mt-3 inline-flex items-center gap-1 justify-self-start text-xs font-medium text-[var(--muted)] group-hover:text-[var(--accent)] sm:col-start-auto sm:mt-0 sm:justify-self-end sm:pt-1">
                          <UiText>{notification.readAt ? "열기" : "확인"}</UiText>
                          <ChevronIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        {data.totalPages > 1 ? (
          <UiNav aria-label="알림 페이지" className="flex items-center justify-between border-b border-[var(--line)] py-6">
            <span className="text-xs tabular-nums text-[var(--muted)]">{data.page} / {data.totalPages}</span>
            <div className="flex gap-5">
              {data.page > 1 ? <PaginationDirectionLink direction="previous" href={`/notifications?page=${data.page - 1}`} /> : null}
              {data.page < data.totalPages ? <PaginationDirectionLink direction="next" href={`/notifications?page=${data.page + 1}`} /> : null}
            </div>
          </UiNav>
        ) : null}
      </div>
    </main>
  );
}
