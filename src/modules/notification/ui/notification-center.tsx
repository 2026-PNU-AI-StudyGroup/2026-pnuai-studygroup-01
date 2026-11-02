import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { NotificationPage } from "@/modules/notification/application/notification-ports";
import type { NotificationType } from "@/modules/notification/domain/notification";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { CheckIcon } from "@/shared/ui/workspace-icons";
import { ProjectPagination } from "@/shared/ui/project-pagination";

const typeLabel: Record<NotificationType, string> = {
  APPLICATION_RESULT: "지원 결과",
  REPORT_ACTIVITY: "보고서",
  PROJECT_REQUEST: "회의·검토",
  DISCUSSION: "팀 대화",
  TOPIC_APPROVAL: "프로젝트 등록",
  DEADLINE: "마감",
  SYSTEM: "안내",
};

/**
 * 알림 화면. 읽지 않은 알림이 몇 개인지가 제목 밑 한 줄이고, 목록 한 장이 가장 크다.
 * 행 전체가 열기 버튼이다. 읽지 않은 행은 왼쪽 파란 점과 굵은 제목으로만 가른다.
 */
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
    <div className="grid gap-3.5">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)]"><UiText>{"알림"}</UiText></h1>
          {data.total ? (
            <p className="mt-1.5 text-sm text-[var(--ink)]">
              {data.unreadCount
                ? <b className="font-semibold"><UiText>{`읽지 않은 알림이 ${data.unreadCount}개 있습니다.`}</UiText></b>
                : <UiText>{"모든 알림을 읽었습니다."}</UiText>}
            </p>
          ) : null}
        </div>
        {data.unreadCount ? (
          <form action={markAllRead}>
            <button className="button-secondary button-compact gap-1.5"><CheckIcon className="size-4 shrink-0" /><UiText>{"모두 읽음으로 표시"}</UiText></button>
          </form>
        ) : null}
      </header>

      <section aria-labelledby="notification-list-title" className={cardClass}>
        <CardHead
          id="notification-list-title"
          title={<UiText>{"최근 활동"}</UiText>}
          count={<>{data.total}<UiText>{"개"}</UiText></>}
        />
        {data.items.length === 0 ? (
          <div role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
            <h3 className="font-medium text-[var(--ink)]"><UiText>{"새로운 알림이 없습니다"}</UiText></h3>
            <p className="mt-0.5 text-[var(--muted)]"><UiText>{"새 활동이 생기면 이 목록에 표시됩니다."}</UiText></p>
          </div>
        ) : (
          <ol>
            {data.items.map((notification) => {
              const unread = !notification.readAt;
              return (
                <li key={notification.id} className="border-t border-[var(--line)]">
                  <form action={openNotification}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button
                      type="submit"
                      className="record-row group grid w-full grid-cols-[0.5rem_minmax(0,1fr)] items-start gap-x-3 px-5 py-3 text-left sm:grid-cols-[0.5rem_minmax(0,1fr)_auto]"
                    >
                      <span aria-hidden="true" className={`mt-[0.4375rem] size-1.5 rounded-full max-sm:mt-[0.3125rem] ${unread ? "bg-[var(--primary)]" : ""}`} />
                      <span className="min-w-0">
                        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="flex-none text-xs text-[var(--muted)]"><UiText>{typeLabel[notification.type]}</UiText></span>
                          <span role="heading" aria-level={3} className={`min-w-0 text-sm leading-5 text-[var(--ink)] sm:truncate ${unread ? "font-semibold" : "font-medium"}`}><UiText>{notification.title}</UiText></span>
                        </span>
                        {unread ? <span className="sr-only"><UiText>{"읽지 않은 알림"}</UiText></span> : null}
                        <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-[1.125rem] text-[var(--muted)]"><UiText>{notification.body}</UiText></span>
                      </span>
                      <span className="col-start-2 mt-1 flex items-baseline gap-3 sm:col-start-auto sm:mt-0 sm:grid sm:justify-items-end sm:gap-1 sm:text-right">
                        <time className="whitespace-nowrap text-xs tabular-nums text-[var(--muted)]" dateTime={notification.createdAt.toISOString()}>
                          <UiDate value={notification.createdAt} mode="dateTime" />
                        </time>
                        <span className="text-[0.8125rem] font-medium text-[var(--primary)] group-hover:underline group-hover:underline-offset-[3px]">
                          <UiText>{unread ? "확인" : "열기"}</UiText>
                        </span>
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ol>
        )}
        {data.totalPages > 1 ? (
          <div className="px-5 pb-5">
            <ProjectPagination page={data.page} totalPages={data.totalPages} href={(page) => `/notifications?page=${page}`} ariaLabel="알림 페이지" />
          </div>
        ) : null}
      </section>
    </div>
  );
}
