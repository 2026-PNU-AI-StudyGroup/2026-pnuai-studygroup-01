"use client";

import Link from "next/link";
import { useId, useRef } from "react";

import type {
  AdminProjectCardData,
  AdminProjectCardContact,
} from "@/modules/team/application/list-admin-project-card-data";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { CloseIcon } from "@/shared/ui/workspace-icons";

export function AdminProjectCardActions({ projectTitle, data }: {
  projectTitle: string;
  data?: AdminProjectCardData;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contactTriggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {data ? (
          <Link href={`/projects/${encodeURIComponent(data.topicId)}`} className="button-secondary min-h-10 w-full px-2 text-xs">
            <UiText>{"진행 현황"}</UiText>
          </Link>
        ) : (
          <UnavailableActionButton label="진행 현황" />
        )}
        {data ? (
          <button
            ref={contactTriggerRef}
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="button-secondary min-h-10 w-full px-2 text-xs"
          >
            <UiText>{"연락처 정보"}</UiText>
          </button>
        ) : (
          <UnavailableActionButton label="연락처 정보" />
        )}
      </div>
      {data ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onClose={() => contactTriggerRef.current?.focus({ preventScroll: true })}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--surface)] p-0 text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.22)] backdrop:bg-[var(--backdrop)]"
        >
          <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 pr-16 sm:px-7 sm:py-6 sm:pr-20">
            <p className="text-xs font-bold text-[var(--primary)]"><UiText>{projectTitle}</UiText></p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold tracking-[-0.035em]">
              <UiText>{"팀 연락처"}</UiText>
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              <UiText>{`${data.team.name} · 팀원 ${data.team.members.length}명`}</UiText>
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={"연락처 정보 닫기"}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] sm:right-5 sm:top-5"
            >
              <CloseIcon className="size-5" />
            </button>
          </header>

          <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {data.team.members.length ? (
              <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
                {data.team.members.map((member) => <MemberContactCard key={member.id} member={member} />)}
              </ul>
            ) : (
              <EmptyState variant="section" title="등록된 팀원이 없습니다" description="팀원이 추가되면 연락처를 확인할 수 있습니다." />
            )}
          </div>
        </dialog>
      ) : null}
    </>
  );
}

function UnavailableActionButton({ label }: { label: string }) {
  const tooltipId = useId();
  return (
    <span className="group relative block">
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={tooltipId}
        className="button-secondary min-h-10 w-full cursor-not-allowed px-2 text-xs"
      >
        <UiText>{label}</UiText>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 z-20 w-max max-w-48 -translate-x-1/2 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-center text-xs font-semibold leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <UiText>{"팀 구성 후 확인할 수 있습니다."}</UiText>
      </span>
    </span>
  );
}

function MemberContactCard({ member }: { member: AdminProjectCardContact }) {
  return (
    <li className="grid gap-4 px-4 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:px-5 sm:py-5">
      <div className="flex items-center gap-2 sm:block">
        <h3 className="font-bold tracking-[-0.02em]">{member.name}</h3>
        <span className="rounded-md bg-[var(--primary-subtle)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--primary)] sm:mt-1.5 sm:inline-block">
          <UiText>{member.role === "LEADER" ? "팀장" : "팀원"}</UiText>
        </span>
      </div>
      <div className="min-w-0">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <ContactDetail label="이메일" value={member.email} kind="email" />
          <ContactDetail label="연락 이메일" value={member.contactEmail} kind="email" />
          <ContactDetail label="전화번호" value={member.phone} kind="phone" />
          <ContactDetail label="카카오톡" value={member.kakao} />
        </dl>
        {member.github || member.instagram ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <SocialContact label="GitHub" value={member.github} />
            <SocialContact label="Instagram" value={member.instagram} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ContactDetail({ label, value, kind }: {
  label: string;
  value: string | null;
  kind?: "email" | "phone";
}) {
  if (!value) return null;
  const href = value
    ? kind === "email"
      ? `mailto:${value}`
      : kind === "phone"
        ? `tel:${value.replace(/[^+\d]/g, "")}`
        : /^https?:\/\//.test(value)
          ? value
          : undefined
    : undefined;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className="mt-0.5 min-w-0 break-all font-semibold">
        {href ? (
          <a href={href} target={kind ? undefined : "_blank"} rel={kind ? undefined : "noopener noreferrer"} className="text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-2 hover:text-[var(--primary)] hover:decoration-current">
            {value}
          </a>
        ) : value}
      </dd>
    </div>
  );
}

function SocialContact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  const linked = /^https?:\/\//.test(value);
  const content = (
    <>
      <strong>{label}</strong>
      <span className="max-w-48 truncate text-[var(--muted)]">{compactSocialValue(value)}</span>
      {linked ? <span aria-hidden="true">↗</span> : null}
    </>
  );
  const className = "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-lg bg-[var(--surface-subtle)] px-2.5 text-xs hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)]";
  return linked ? (
    <a href={value} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
  ) : (
    <span className={className}>{content}</span>
  );
}

function compactSocialValue(value: string) {
  return value.replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
}
