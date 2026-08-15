"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton, UiDiv } from "@/modules/translation/ui/localized-elements";
import { AddIcon, CloseIcon, EditIcon, PinIcon } from "@/shared/ui/workspace-icons";
import { AnnouncementAttachmentList } from "@/modules/announcement/ui/announcement-attachment-list";
import { IconButton, IconLink } from "@/shared/ui/icon-button";
import { EmptyState } from "@/shared/ui/page-primitives";

const MOUSE_DRAG_THRESHOLD_PX = 8;

export function ProgramAnnouncementRail({ announcements, createHref, manageableAnnouncementIds = [], returnHref }: {
  announcements: AnnouncementRecord[];
  createHref?: string;
  manageableAnnouncementIds?: string[];
  returnHref?: string;
}) {
  const railRef = useRef<HTMLOListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();
  const dragRef = useRef({ pointerId: -1, startX: 0, startScrollLeft: 0, moved: false });
  const clickResetTimerRef = useRef<number | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [dragging, setDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCanScrollLeft(rail.scrollLeft > 1);
    setCanScrollRight(rail.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const rail = railRef.current;
    const observer = rail && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateScrollState)
      : null;
    if (rail) observer?.observe(rail);
    window.addEventListener("resize", updateScrollState);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScrollState);
      if (clickResetTimerRef.current !== null) window.clearTimeout(clickResetTimerRef.current);
    };
  }, [announcements.length, updateScrollState]);

  useEffect(() => {
    if (selectedAnnouncement && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [selectedAnnouncement]);

  const scrollOneCard = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const cards = [...rail.querySelectorAll<HTMLElement>("li")];
    if (cards.length === 0) return;
    const railLeft = rail.getBoundingClientRect().left;
    const firstCardLeft = cards[0]!.getBoundingClientRect().left - railLeft + rail.scrollLeft;
    const positions = cards.map((card) => (
      card.getBoundingClientRect().left - railLeft + rail.scrollLeft - firstCardLeft
    ));
    const target = direction === 1
      ? positions.find((position) => position > rail.scrollLeft + 1)
      : positions.findLast((position) => position < rail.scrollLeft - 1);
    if (target === undefined) return;
    rail.scrollTo({ left: target, behavior: "smooth" });
  };

  const startDragging = (event: ReactPointerEvent<HTMLOListElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    if (clickResetTimerRef.current !== null) window.clearTimeout(clickResetTimerRef.current);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
  };

  const moveDragging = (event: ReactPointerEvent<HTMLOListElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > MOUSE_DRAG_THRESHOLD_PX && !drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    if (!drag.moved) return;
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
    updateScrollState();
  };

  const stopDragging = (event: ReactPointerEvent<HTMLOListElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.pointerId = -1;
    setDragging(false);
    if (dragRef.current.moved) {
      clickResetTimerRef.current = window.setTimeout(() => {
        dragRef.current.moved = false;
        clickResetTimerRef.current = null;
      }, 0);
    }
  };

  const suppressDraggedActivation = (event: ReactMouseEvent<HTMLOListElement>) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
    if (clickResetTimerRef.current !== null) {
      window.clearTimeout(clickResetTimerRef.current);
      clickResetTimerRef.current = null;
    }
  };

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

  return (
    <section aria-labelledby="program-announcements-title" className="border-b border-[var(--line)] py-5">
      <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
        <h2 id="program-announcements-title" className="text-sm font-bold tracking-[-0.02em] text-[var(--ink)]">
          <UiText>{"프로그램 공지"}</UiText>
        </h2>
        {createHref ? (
          <Link href={createHref} className="button-secondary min-h-9 gap-2 px-3 text-xs">
            <AddIcon className="size-3.5 shrink-0" />
            <UiText>{"새 공지 작성"}</UiText>
          </Link>
        ) : null}
      </div>
      {announcements.length === 0 ? (
        <EmptyState variant="section" title="등록된 공지가 없습니다" description="프로그램 공지가 등록되면 이곳에 표시됩니다." />
      ) : (
        <div className="relative">
          <ol
            ref={railRef}
            onScroll={updateScrollState}
            onPointerDown={startDragging}
            onPointerMove={moveDragging}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onClickCapture={suppressDraggedActivation}
            onDragStart={(event) => event.preventDefault()}
            className={`-mx-5 flex select-none gap-3 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          >
            {announcements.map((announcement) => (
              <li key={announcement.id} className="w-[82vw] max-w-[22rem] shrink-0 sm:w-80">
                <button
                  type="button"
                  onClick={(event) => openAnnouncement(event, announcement)}
                  className={`group flex h-full min-h-48 w-full flex-col rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${dragging ? "cursor-grabbing transition-none" : "cursor-pointer transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-panel)]"}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {announcement.pinned ? (
                      <span className="inline-flex items-center leading-none text-[var(--primary)]">
                        <PinIcon className="size-3.5" />
                        <span className="sr-only"><UiText>{"고정"}</UiText></span>
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--muted)] ring-1 ring-inset ring-[var(--line-strong)]">
                      <UiText>{announcement.visibility === "AUTHENTICATED" ? "전체 공개" : "구성원 전용"}</UiText>
                    </span>
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-base font-bold leading-6 tracking-[-0.025em] text-[var(--ink)] transition-colors group-hover:text-[var(--primary-hover)]">
                    <UiText>{announcement.title}</UiText>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                    <UiText>{announcement.content.replace(/\s+/g, " ")}</UiText>
                  </p>
                  <div className="mt-auto flex items-center gap-2 pt-5 text-xs font-semibold text-[var(--muted)]">
                    <span className="truncate text-[var(--ink)]">{announcement.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <time className="shrink-0" dateTime={announcement.createdAt.toISOString()}>
                      <UiDate value={announcement.createdAt} mode="date" />
                    </time>
                  </div>
                </button>
              </li>
            ))}
          </ol>
          <UiButton
            type="button"
            aria-label="이전 프로그램 공지"
            disabled={!canScrollLeft}
            onClick={() => scrollOneCard(-1)}
            className="absolute left-0 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-panel)] transition-colors hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-35 sm:-left-4"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-2"><path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </UiButton>
          <UiButton
            type="button"
            aria-label="다음 프로그램 공지"
            disabled={!canScrollRight}
            onClick={() => scrollOneCard(1)}
            className="absolute right-0 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-panel)] transition-colors hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-35 sm:-right-4"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-2"><path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </UiButton>
        </div>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClose={() => {
          setSelectedAnnouncement(null);
          dialogTriggerRef.current?.focus({ preventScroll: true });
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.22)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)] sm:max-h-[min(42rem,calc(100dvh-4rem))]"
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
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--muted)] ring-1 ring-inset ring-[var(--line-strong)]">
                    <UiText>{selectedAnnouncement.visibility === "AUTHENTICATED" ? "전체 공개" : "구성원 전용"}</UiText>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canManageSelected ? (
                    <UiDiv className="flex items-center gap-1" role="group" aria-label="공지 관리">
                      <IconLink href={selectedEditHref} aria-label="공지 수정" title="공지 수정">
                        <EditIcon className="size-5" />
                      </IconLink>
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
            <div className="whitespace-pre-wrap px-6 py-7 text-sm leading-7 sm:px-8 sm:py-8 sm:text-base">
              <UiText>{selectedAnnouncement.content}</UiText>
            </div>
            <AnnouncementAttachmentList attachments={selectedAnnouncement.attachments} compact />
          </article>
        ) : null}
      </dialog>
    </section>
  );
}
