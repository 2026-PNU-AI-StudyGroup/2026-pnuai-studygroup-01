"use client";

import { useId, useRef } from "react";

import { TopicApprovalDecisionForm } from "@/app/_components/topic-approval-decision-form";
import type { TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { CloseIcon } from "@/shared/ui/workspace-icons";

const status = {
  PENDING: ["검토 대기", "info"],
  APPROVED: ["승인", "success"],
  REJECTED: ["반려", "danger"],
  WITHDRAWN: ["철회", "neutral"],
  CANCELED: ["취소", "neutral"],
} as const;

export function TopicApprovalDialog({
  request,
  canDecide,
  triggerLabel,
}: {
  request: TopicApprovalRequestSummary;
  canDecide: boolean;
  triggerLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reviewTarget = request.route === "PROFESSOR"
    ? (request.requestedProfessorName ?? "지정 교수") + " 교수"
    : "관리자";
  const isPending = request.status === "PENDING";

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={canDecide && isPending ? "button-primary" : "button-secondary"}
      >
        <UiText>{triggerLabel}</UiText>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus({ preventScroll: true })}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.22)] backdrop:bg-[rgba(23,32,51,.48)]"
      >
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white px-5 py-5 pr-16 sm:px-7 sm:py-6 sm:pr-20">
          <div className="flex items-center gap-2">
            <StatusBadge tone={status[request.status][1]}>{status[request.status][0]}</StatusBadge>
            <p className="truncate text-xs font-bold text-[var(--primary)]"><UiText>{request.programName}</UiText></p>
          </div>
          <h2 id={titleId} className="mt-3 text-2xl font-bold tracking-[-0.035em]">
            <UiText>{request.topicTitle}</UiText>
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="등록 내용 닫기"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] sm:right-5 sm:top-5"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>

        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <dl className="grid gap-x-8 gap-y-4 border-b border-[var(--line)] pb-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"등록자"}</UiText></dt>
              <dd className="mt-1 font-semibold"><UiText>{request.requesterName}</UiText></dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"검토 요청 대상"}</UiText></dt>
              <dd className="mt-1 font-semibold"><UiText>{reviewTarget}</UiText></dd>
            </div>
          </dl>

          <section className="border-b border-[var(--line)] py-6">
            <h3 className="text-sm font-bold"><UiText>{"등록 설명"}</UiText></h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]"><UiText>{request.description}</UiText></p>
          </section>

          <section className="py-6">
            <h3 className="text-sm font-bold"><UiText>{"프로젝트 팀"}</UiText></h3>
            {request.projectTeam ? (
              <>
                <p className="mt-2 font-semibold"><UiText>{request.projectTeam.name}</UiText></p>
                <ul className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
                  {request.projectTeam.members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="font-semibold"><UiText>{member.name}</UiText></span>
                      <span className="text-xs font-bold text-[var(--muted)]"><UiText>{member.role === "LEADER" ? "팀장" : "팀원"}</UiText></span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]"><UiText>{"등록된 프로젝트 팀이 없습니다."}</UiText></p>
            )}
          </section>

          {canDecide && isPending ? (
            <section className="border-t border-[var(--line)] pt-6">
              <h3 className="text-sm font-bold"><UiText>{"승인 검토"}</UiText></h3>
              <div className="mt-4">
                <TopicApprovalDecisionForm requestId={request.id} onSuccess={close} />
              </div>
            </section>
          ) : request.reviewComment ? (
            <section className="border-t border-[var(--line)] pt-6">
              <h3 className="text-sm font-bold"><UiText>{"검토 의견"}</UiText></h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]"><UiText>{request.reviewComment}</UiText></p>
            </section>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
