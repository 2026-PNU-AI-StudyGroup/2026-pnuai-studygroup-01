"use client";

import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiButton } from "@/modules/translation/ui/localized-elements";
import { UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useEffect, useId, useRef, useState } from "react";

import type { NotificationType } from "@/modules/notification/domain/notification";

export type NotificationPreviewItem = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

const typeLabel: Record<NotificationType, string> = {
  APPLICATION_RESULT: "지원 결과",
  REPORT_ACTIVITY: "보고서",
  DEADLINE: "마감",
  SYSTEM: "안내",
};

export function NotificationPopover({
  active,
  placement,
  inverse = false,
  unreadCount,
  items,
  openNotification,
}: {
  active: boolean;
  placement: "side" | "below";
  inverse?: boolean;
  unreadCount: number;
  items: NotificationPreviewItem[];
  openNotification: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const accessibleCount = unreadCount > 99 ? "99개 이상" : `${unreadCount}개`;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <UiButton
        ref={buttonRef}
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={unreadCount ? `읽지 않은 알림 ${accessibleCount}` : "알림"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`snap-color relative grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] ${
          inverse
            ? open || active
              ? "bg-white/16 text-white"
              : "text-[#cbd6ff] hover:bg-white/10 hover:text-white"
            : open || active
              ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
        }`}
      >
        {active ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
            <path d="M12 2.5A6.5 6.5 0 0 0 5.5 9v3.1c0 2.2-.8 3.4-1.7 4.5-.6.8-.1 2 1 2h14.4c1.1 0 1.6-1.2 1-2-.9-1.1-1.7-2.3-1.7-4.5V9A6.5 6.5 0 0 0 12 2.5ZM9.5 20a2.7 2.7 0 0 0 5 0h-5Z" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]">
            <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M10 21h4" />
          </svg>
        )}
        {unreadCount ? (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[var(--danger)] px-1 text-center text-[0.625rem] font-black leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </UiButton>

      {open ? (
        <UiSection
          id={panelId}
          role="dialog"
          aria-label="최근 알림"
          className={`absolute z-50 text-left text-[var(--ink)] ${
            placement === "side"
              ? "bottom-0 left-[calc(100%+0.75rem)] w-[23rem]"
              : "fixed left-4 right-4 top-[4.75rem] w-auto"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute z-10 size-3 rotate-45 bg-white ${
              placement === "side"
                ? "-left-1.5 bottom-4 border-b border-l border-[var(--line-strong)]"
                : "-top-1.5 right-[7.75rem] border-l border-t border-[var(--line-strong)] sm:right-[8.5rem]"
            }`}
          />
          <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white shadow-[0_12px_32px_rgb(23_32_51_/_0.14)]">
            <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
              <h2 className="text-base font-extrabold tracking-[-0.025em]"><UiText>{"알림"}</UiText></h2>
              <span className="text-xs font-semibold text-[var(--muted)]">
                <UiText>{unreadCount ? `읽지 않음 ${accessibleCount}` : "모두 확인함"}</UiText>
              </span>
            </header>

            {items.length ? (
              <ol>
                {items.map((item) => (
                  <li key={item.id} className="border-b border-[var(--line)] last:border-b-0">
                    <form action={openNotification}>
                      <input type="hidden" name="notificationId" value={item.id} />
                      <button
                        type="submit"
                        className="record-row grid min-h-24 w-full grid-cols-[0.5rem_minmax(0,1fr)] gap-3 px-5 py-4 text-left focus-visible:relative focus-visible:z-10"
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 size-2 rounded-full ${item.read ? "bg-[var(--line-strong)]" : "bg-[var(--primary)]"}`}
                        />
                        <span className="min-w-0">
                          <span className="flex items-center justify-between gap-3">
                            <span className={`text-xs font-bold ${item.read ? "text-[var(--muted)]" : "text-[var(--primary)]"}`}>
                              <UiText>{typeLabel[item.type]}</UiText>
                            </span>
                            <time className="shrink-0 text-[11px] font-medium text-[var(--muted)]" dateTime={item.createdAt}>
                              <UiDate value={new Date(item.createdAt)} mode="dateTime" />
                            </time>
                          </span>
                          <strong className="mt-1.5 block truncate text-sm font-extrabold"><UiText>{item.title}</UiText></strong>
                          <span className="mt-1 line-clamp-1 block text-xs leading-5 text-[var(--muted)]"><UiText>{item.body}</UiText></span>
                          {!item.read ? <span className="sr-only"><UiText>{"읽지 않은 알림"}</UiText></span> : null}
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-extrabold"><UiText>{"새로운 알림이 없습니다"}</UiText></p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]"><UiText>{"프로젝트 활동이 생기면 여기에 표시됩니다."}</UiText></p>
              </div>
            )}

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-center border-t border-[var(--line)] px-5 text-sm font-extrabold text-[var(--primary)] hover:bg-[var(--primary-subtle)]"
            >
              <UiText>{"전체 알림 보기"}</UiText><svg aria-hidden="true" viewBox="0 0 20 20" className="ml-1.5 size-4 fill-none stroke-current stroke-[1.75]">
                <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </UiSection>
      ) : null}
    </div>
  );
}
