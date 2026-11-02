"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiDiv } from "@/modules/translation/ui/localized-elements";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { AddIcon, CloseIcon, EditIcon, PinIcon } from "@/shared/ui/workspace-icons";
import { AnnouncementAttachmentList } from "@/modules/announcement/ui/announcement-attachment-list";
import { IconButton, IconLink } from "@/shared/ui/icon-button";

/** 처음에 보이는 공지 수. 나머지는 접어 두고 펼쳐 본다. */
const VISIBLE_ANNOUNCEMENTS = 5;

/**
 * 사업 공지 목록. 화면 옆 칸에 조용히 두는 카드다. 한 줄에 제목, 그 아래에 쓴 사람과 날짜.
 * 누르면 본문을 대화상자로 연다. 예전의 가로로 넘기는 큰 카드는 목록을 아래로 밀어냈다.
 */
export function ProgramAnnouncementRail({ announcements, createHref, manageableAnnouncementIds = [], returnHref, deleteControls }: {
  announcements: AnnouncementRecord[];
  createHref?: string;
  manageableAnnouncementIds?: string[];
  returnHref?: string;
  /** 공지별 삭제 버튼. 서버 액션을 쓰는 폼이라 앱 계층에서 만들어 넣는다. */
  deleteControls?: Record<string, ReactNode>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);

  useEffect(() => {
    if (selectedAnnouncement && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedAnnouncement]);

  const openAnnouncement = (
    event: ReactMouseEvent<HTMLButtonElement>,
    announcement: AnnouncementRecord,
  ) => {
    dialogTriggerRef.current = event.currentTarget;
    setSelectedAnnouncement(announcement);
  };

  const closeAnnouncement = () => dialogRef.current?.close();
  const canManageSelected = selectedAnnouncement
    ? manageableAnnouncementIds.includes(selectedAnnouncement.id)
    : false;
  const selectedEditHref = selectedAnnouncement
    ? `/announcements/${selectedAnnouncement.id}/edit${returnHref ? `?returnTo=${encodeURIComponent(returnHref)}` : ""}`
    : "";
  const item = (announcement: AnnouncementRecord) => (
    <li key={announcement.id} className="[&+li]:border-t [&+li]:border-[var(--line)]">
      <button
        type="button"
        onClick={(event) => openAnnouncement(event, announcement)}
        className="group block w-full py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {announcement.pinned ? (
            <span className="inline-flex shrink-0 text-[var(--primary)]">
              <PinIcon className="size-3.5" />
              <span className="sr-only"><UiText>{"고정"}</UiText></span>
            </span>
          ) : null}
          <span className="truncate text-sm font-medium text-[var(--ink)] group-hover:text-[var(--primary)]"><UiText>{announcement.title}</UiText></span>
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-[var(--muted)]">
          <span className="truncate">{announcement.authorName}</span>
          <time className="shrink-0 tabular-nums" dateTime={announcement.createdAt.toISOString()}><UiDate value={announcement.createdAt} mode="date" /></time>
          {announcement.visibility === "AUTHENTICATED" ? null : <span className="shrink-0"><UiText>{"구성원 전용"}</UiText></span>}
        </span>
      </button>
    </li>
  );

  return (
    <section aria-labelledby="program-announcements-title" className="min-w-0 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-baseline gap-2.5 px-5 pb-1.5 pt-4">
        <h2 id="program-announcements-title" className="text-base font-semibold text-[var(--ink)]">
          <UiText>{"프로그램 공지"}</UiText>
        </h2>
        {announcements.length ? <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{announcements.length}<UiText>{"건"}</UiText></span> : null}
        {createHref ? (
          <Link href={createHref} className="ml-auto inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]">
            <AddIcon className="size-3.5 shrink-0" />
            <UiText>{"새 공지 작성"}</UiText>
          </Link>
        ) : null}
      </div>
      {announcements.length === 0 ? (
        <p role="status" className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"등록된 공지가 없습니다"}</UiText></p>
      ) : (
        <div className="px-5 pb-2">
          <ol>{announcements.slice(0, VISIBLE_ANNOUNCEMENTS).map(item)}</ol>
          {announcements.length > VISIBLE_ANNOUNCEMENTS ? (
            <details className="group border-t border-[var(--line)]">
              <summary className="cursor-pointer list-none py-2.5 text-[0.8125rem] font-medium text-[var(--primary)] group-open:hidden [&::-webkit-details-marker]:hidden">
                <UiText>{`공지 ${announcements.length - VISIBLE_ANNOUNCEMENTS}건 더 보기`}</UiText>
              </summary>
              <ol>{announcements.slice(VISIBLE_ANNOUNCEMENTS).map(item)}</ol>
            </details>
          ) : null}
        </div>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClose={() => {
          setSelectedAnnouncement(null);
          dialogTriggerRef.current?.focus({ preventScroll: true });
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--surface)] p-0 text-[var(--ink)] shadow-[var(--shadow-float)] [overscroll-behavior:contain] backdrop:bg-[var(--backdrop)] sm:max-h-[min(42rem,calc(100dvh-4rem))]"
      >
        {selectedAnnouncement ? (
          <article>
            <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-7 sm:px-8 sm:py-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-h-11 flex-wrap items-center gap-1.5">
                  {selectedAnnouncement.pinned ? (
                    <span className="inline-flex items-center leading-none text-[var(--primary)]">
                      <PinIcon className="size-3.5" />
                      <span className="sr-only"><UiText>{"고정"}</UiText></span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full bg-[var(--surface)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--muted)] ring-1 ring-inset ring-[var(--line-strong)]">
                    <UiText>{selectedAnnouncement.visibility === "AUTHENTICATED" ? "전체 공개" : "구성원 전용"}</UiText>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canManageSelected ? (
                    <UiDiv className="flex items-center gap-1" role="group" aria-label="공지 관리">
                      <IconLink href={selectedEditHref} aria-label="공지 수정" title="공지 수정">
                        <EditIcon className="size-5" />
                      </IconLink>
                      {deleteControls?.[selectedAnnouncement.id] ?? null}
                    </UiDiv>
                  ) : null}
                  <IconButton type="button" aria-label="공지 닫기" title="공지 닫기" onClick={closeAnnouncement}>
                    <CloseIcon className="size-5" />
                  </IconButton>
                </div>
              </div>
              <h2 id={dialogTitleId} className="mt-4 text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-3xl">
                <UiText>{selectedAnnouncement.title}</UiText>
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <span className="text-[var(--ink)]">{selectedAnnouncement.authorName}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={selectedAnnouncement.createdAt.toISOString()}>
                  <UiDate value={selectedAnnouncement.createdAt} mode="dateTime" />
                </time>
              </div>
            </header>
            <div className="px-6 py-7 text-sm leading-7 sm:px-8 sm:py-8 sm:text-base">
              <LocalizedMarkdown text={selectedAnnouncement.content} />
            </div>
            <AnnouncementAttachmentList attachments={selectedAnnouncement.attachments} compact />
          </article>
        ) : null}
      </dialog>
    </section>
  );
}
