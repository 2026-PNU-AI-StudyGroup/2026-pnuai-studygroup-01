import Link from "next/link";
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
const typeLabel: Record<NotificationType, string> = {
  APPLICATION_RESULT: "지원 결과",
  REPORT_ACTIVITY: "보고서",
  PROJECT_REQUEST: "미팅·검토",
  DISCUSSION: "팀 대화",
  TOPIC_APPROVAL: "프로젝트 제안",
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
    <main className="page-enter w-full px-5 py-8 pb-24 sm:px-8 lg:px-12 lg:py-12">
      <header className="border-b border-[var(--line)] pb-8">
        <h1 className="text-[clamp(2.1rem,4vw,3rem)] font-bold leading-none tracking-[-0.055em]"><UiText>{"알림"}</UiText></h1>
        <p className="mt-3 text-[0.9375rem] leading-6 text-[var(--muted)]">
          <UiText>{"프로젝트 지원, 팀 활동, 제출 일정의 변화를 확인합니다."}</UiText></p>
      </header>
      <div className="pt-10">
        <section aria-labelledby="notification-list-title">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-7">
            <div>
              <h2 id="notification-list-title" className="text-2xl font-bold tracking-[-0.035em]"><UiText>{"최근 활동"}</UiText></h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                <UiText>{"전체"}</UiText>{data.total}<UiText>{"개"}</UiText>{data.unreadCount ? <span className="ml-3 font-semibold text-[var(--primary)]"><UiText>{"읽지 않음"}</UiText>{" "}{data.unreadCount}<UiText>{"개"}</UiText></span> : null}
              </p>
            </div>
            {data.unreadCount ? (
              <form action={markAllRead}>
                <button className="button-secondary"><UiText>{"모두 읽음"}</UiText></button>
              </form>
            ) : null}
          </div>

          {data.items.length === 0 ? (
            <div className="flex items-center gap-4 border-b border-[var(--line)] py-14">
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted)]">
                <BellIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold"><UiText>{"새로운 알림이 없습니다"}</UiText></p>
                <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"새로운 프로젝트 활동이 생기면 이곳에 표시됩니다."}</UiText></p>
              </div>
            </div>
          ) : (
            <ol className="relative before:absolute before:bottom-7 before:left-[11px] before:top-7 before:w-px before:bg-[var(--line)]">
              {data.items.map((notification) => {
                const Icon = typeIcon[notification.type];
                return (
                  <li key={notification.id} className="relative border-b border-[var(--line)]">
                    <form
                      action={openNotification}
                      className="record-row grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 py-6 sm:grid-cols-[1.5rem_7.5rem_minmax(0,1fr)_4.5rem] sm:items-start sm:gap-x-5"
                    >
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <span
                        aria-hidden="true"
                        className={`relative z-10 grid size-6 place-items-center rounded-full border ${
                          notification.readAt
                            ? "border-[var(--line-strong)] bg-white text-[var(--muted)]"
                            : "border-[var(--primary)] bg-[var(--primary)] text-white"
                        }`}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="hidden pt-0.5 sm:block">
                        <p className={`text-xs font-semibold ${notification.readAt ? "text-[var(--muted)]" : "text-[var(--primary)]"}`}>
                          {typeLabel[notification.type]}
                        </p>
                        <time className="mt-2 block text-[11px] leading-4 text-[var(--muted)]" dateTime={notification.createdAt.toISOString()}>
                          <UiDate value={notification.createdAt} mode="dateTime" />
                        </time>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 sm:hidden">
                          <span className={`text-xs font-semibold ${notification.readAt ? "text-[var(--muted)]" : "text-[var(--primary)]"}`}>
                            {typeLabel[notification.type]}
                          </span>
                          {!notification.readAt ? <span className="size-1.5 rounded-full bg-[var(--primary)]" aria-hidden="true" /> : null}
                        </div>
                        <h3 className="mt-2 text-[15px] font-bold leading-6 sm:mt-0"><UiText>{notification.title}</UiText></h3>
                        {!notification.readAt ? <span className="sr-only"><UiText>{"읽지 않은 알림"}</UiText></span> : null}
                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--muted)]"><UiText>{notification.body}</UiText></p>
                        <time className="mt-2 block text-[11px] text-[var(--muted)] sm:hidden" dateTime={notification.createdAt.toISOString()}>
                          <UiDate value={notification.createdAt} mode="dateTime" />
                        </time>
                      </div>
                      <button className="group col-start-2 mt-3 inline-flex items-center gap-1 justify-self-start text-xs font-semibold text-[var(--muted)] hover:text-[var(--primary)] sm:col-start-auto sm:mt-0 sm:justify-self-end sm:pt-1">
                        <UiText>{notification.readAt ? "열기" : "확인"}</UiText>
                        <ChevronIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
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
            <span className="text-xs font-semibold text-[var(--muted)]">{data.page} / {data.totalPages}</span>
            <div className="flex gap-5">
              {data.page > 1 ? <Link className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--primary)]" href={`/notifications?page=${data.page - 1}`}><UiText>{"이전"}</UiText></Link> : null}
              {data.page < data.totalPages ? <Link className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--primary)]" href={`/notifications?page=${data.page + 1}`}><UiText>{"다음"}</UiText></Link> : null}
            </div>
          </UiNav>
        ) : null}
      </div>
    </main>
  );
}
