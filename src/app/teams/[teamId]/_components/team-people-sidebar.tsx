"use client";

import { useEffect, useRef, useState } from "react";

import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";

type TeamMember = TeamWorkspace["members"][number];

export function TeamPeopleSidebar({
  advisorEnabled,
  professorName,
  assistants,
  members,
}: {
  advisorEnabled: boolean;
  professorName: string;
  assistants: TeamWorkspace["assistants"];
  members: TeamWorkspace["members"];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (activeMember && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [activeMember]);

  const people = (
    <PeopleContent
      advisorEnabled={advisorEnabled}
      professorName={professorName}
      assistants={assistants}
      members={members}
      onSelectMember={setActiveMember}
    />
  );

  return (
    <>
      <details className="group mt-4 border-t border-[var(--line)] pt-4 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          <span><UiText>{"프로젝트 구성원"}</UiText></span>
          <span className="text-xs text-[var(--muted)]">
            <UiText>{"팀원"}</UiText>{" "}{members.length}<UiText>{"명"}</UiText>
            <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-180">⌄</span>
          </span>
        </summary>
        <div className="pb-2 pt-3">{people}</div>
      </details>

      <div className="mt-7 hidden border-t border-[var(--line)] pt-5 lg:block">{people}</div>

      <dialog
        ref={dialogRef}
        aria-labelledby="team-member-detail-title"
        onClose={() => setActiveMember(null)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-0 text-[var(--ink)] shadow-[0_28px_90px_rgba(31,35,48,.25)] backdrop:bg-[var(--ink)]/45"
      >
        {activeMember ? (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--primary-subtle)] text-sm font-black text-[var(--primary-hover)]">
                  {activeMember.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <h2 id="team-member-detail-title" className="text-xl font-black tracking-[-0.035em]">{activeMember.name}</h2>
                  <p className="mt-1 break-all text-sm text-[var(--muted)]">{activeMember.email}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="닫기"
                className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
                onClick={() => dialogRef.current?.close()}
              >
                ×
              </button>
            </div>

            <dl className="mt-7 grid gap-x-8 gap-y-5 border-t border-[var(--line)] pt-6 text-sm sm:grid-cols-2">
              <MemberDetail label="학과" value={activeMember.department} />
              <MemberDetail label="학번" value={activeMember.studentNumber} />
              <MemberDetail label="학년" value={activeMember.grade ? `${activeMember.grade}학년` : null} />
              <MemberDetail label="휴대폰 번호" value={activeMember.phoneNumber} />
              <MemberDetail label="자주 쓰는 이메일 주소" value={activeMember.contactEmail} breakAll />
              <MemberDetail label="희망 역할" value={activeMember.profile?.desiredRole} />
              <MemberDetail label="활동 가능 시간" value={activeMember.profile?.availability} />
            </dl>

            <div className="mt-6 grid gap-6 border-t border-[var(--line)] pt-6">
              <MemberTags label="관심 분야" values={activeMember.profile?.interests} />
              <MemberTags label="보유 기술" values={activeMember.profile?.skills} />
              <div>
                <h3 className="text-xs font-bold text-[var(--muted)]"><UiText>{"자기소개"}</UiText></h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {activeMember.profile?.bio || <UiText>{"미입력"}</UiText>}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function PeopleContent({
  advisorEnabled,
  professorName,
  assistants,
  members,
  onSelectMember,
}: {
  advisorEnabled: boolean;
  professorName: string;
  assistants: TeamWorkspace["assistants"];
  members: TeamWorkspace["members"];
  onSelectMember: (member: TeamMember) => void;
}) {
  return (
    <div className="space-y-5">
      {advisorEnabled ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"><UiText>{"지도교수"}</UiText></p>
          <p className="mt-1.5 text-sm font-semibold">{professorName}</p>
        </div>
      ) : null}

      {assistants.length ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"><UiText>{"조교"}</UiText></p>
          <ul aria-label="프로젝트 조교" className="mt-2 space-y-2">
            {assistants.map((assistant) => (
              <li key={assistant.id} className="min-w-0">
                <p className="truncate text-sm font-semibold">{assistant.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">{assistant.email}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          <UiText>{"팀원"}</UiText>{" "}{members.length}<UiText>{"명"}</UiText>
        </p>
        <ul aria-label="프로젝트 팀원" className="mt-2 space-y-1">
          {members.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                aria-label={`${member.name} 상세 정보`}
                className="flex min-h-10 w-full items-center gap-2 rounded-xl px-1.5 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--primary-hover)]"
                onClick={() => onSelectMember(member)}
              >
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[0.6875rem] font-black text-[var(--primary-hover)]">
                  {member.name.slice(0, 1)}
                </span>
                <span className="truncate">{member.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MemberDetail({ label, value, breakAll = false }: { label: string; value: string | null | undefined; breakAll?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className={`mt-1 font-semibold ${breakAll ? "break-all" : "break-words"}`}>
        {value || <UiText>{"미입력"}</UiText>}
      </dd>
    </div>
  );
}

function MemberTags({ label, values }: { label: string; values: string[] | undefined }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></h3>
      {values?.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value} className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold">{value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-semibold"><UiText>{"미입력"}</UiText></p>
      )}
    </div>
  );
}
