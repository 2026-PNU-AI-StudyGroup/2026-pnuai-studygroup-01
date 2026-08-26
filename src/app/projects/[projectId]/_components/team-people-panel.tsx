"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  projectTeamMembershipAction,
  type ProjectTeamMembershipActionState,
} from "@/app/projects/[projectId]/_actions/project-team-membership-actions";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { MemberContacts } from "@/modules/identity/ui/member-contacts";
import { ProjectTeamInviteSection } from "@/app/projects/[projectId]/_components/project-team-invite-section";
import type { ProjectTeamInvitationSummary } from "@/modules/project-team/application/project-team-invitation-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton, UiUl } from "@/modules/translation/ui/localized-elements";
import { CustomSelect } from "@/shared/ui/custom-select";
import { CloseIcon } from "@/shared/ui/workspace-icons";
import { PersonAvatar } from "@/shared/ui/person-avatar";

type TeamMember = TeamWorkspace["members"][number];
type MemberActionKind = "LEAVE" | "REMOVE" | "TRANSFER" | "REMOVE_LEADER";
type MemberAction = { kind: MemberActionKind; member: TeamMember } | null;

const initialState: ProjectTeamMembershipActionState = { status: "idle", message: "" };

export function TeamPeoplePanel({
  advisorEnabled,
  professor,
  assistants,
  members,
  projectId,
  projectTeamId,
  actorId,
  membershipChangesEnabled,
  canManageMembers,
  invitations,
  layout = "page",
}: {
  advisorEnabled: boolean;
  professor: TeamWorkspace["professor"];
  assistants: TeamWorkspace["assistants"];
  members: TeamWorkspace["members"];
  projectId: string;
  projectTeamId: string;
  actorId: string;
  membershipChangesEnabled: boolean;
  canManageMembers: boolean;
  invitations: ProjectTeamInvitationSummary[];
  /** 페이지에서는 그대로 펼치고, 좁은 사이드바에서는 접어 둔다. */
  layout?: "page" | "sidebar";
}) {
  const router = useRouter();
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const membershipDialogRef = useRef<HTMLDialogElement>(null);
  const detailTitleId = useId();
  const membershipTitleId = useId();
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);
  const [memberAction, setMemberAction] = useState<MemberAction>(null);
  const [nextLeaderId, setNextLeaderId] = useState("");
  const [state, action, pending] = useActionState(projectTeamMembershipAction, initialState);
  const [stateAtActionOpen, setStateAtActionOpen] = useState(state);

  useEffect(() => {
    if (activeMember && !detailDialogRef.current?.open) detailDialogRef.current?.showModal();
  }, [activeMember]);

  useEffect(() => {
    if (!memberAction) return;
    if (!membershipDialogRef.current?.open) membershipDialogRef.current?.showModal();
  }, [memberAction]);

  useEffect(() => {
    if (state.status !== "success") return;
    membershipDialogRef.current?.close();
    router.refresh();
  }, [router, state]);

  function openMemberAction(nextAction: Exclude<MemberAction, null>) {
    setNextLeaderId("");
    setStateAtActionOpen(state);
    setMemberAction(nextAction);
  }

  const people = (
    <PeopleContent
      advisorEnabled={advisorEnabled}
      professor={professor}
      assistants={assistants}
      members={members}
      actorId={actorId}
      membershipChangesEnabled={membershipChangesEnabled}
      canManageMembers={canManageMembers}
      pending={pending}
      onSelectMember={setActiveMember}
      onMemberAction={openMemberAction}
    />
  );
  // 사람을 빼는 손잡이 바로 아래에 들이는 손잡이를 둔다. 권한도 같은 값을 쓴다.
  const peopleWithInvite = (
    <div className="space-y-5">
      {people}
      {canManageMembers && membershipChangesEnabled ? (
        <ProjectTeamInviteSection projectId={projectId} projectTeamId={projectTeamId} invitations={invitations} />
      ) : null}
    </div>
  );

  return (
    <>
      {layout === "page" ? <div>{peopleWithInvite}</div> : null}
      {layout === "sidebar" ? (
      <>
      <details className="group mt-4 border-t border-[var(--line)] pt-4 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          <span><UiText>{"프로젝트 구성원"}</UiText></span>
          <span className="text-xs text-[var(--muted)]">
            <UiText>{"팀원"}</UiText>{" "}{members.length}<UiText>{"명"}</UiText>
            <span aria-hidden="true" className="ml-2 inline-block transition-transform group-open:rotate-180">⌄</span>
          </span>
        </summary>
        <div className="pb-2 pt-3">{peopleWithInvite}</div>
      </details>

      <div className="mt-7 hidden border-t border-[var(--line)] pt-5 lg:block">{peopleWithInvite}</div>
      </>
      ) : null}

      <dialog
        ref={detailDialogRef}
        aria-labelledby={detailTitleId}
        onClose={() => setActiveMember(null)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-0 text-[var(--ink)] shadow-[0_28px_90px_rgba(31,35,48,.25)] backdrop:bg-[var(--ink)]/45"
      >
        {activeMember ? (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <PersonAvatar userId={activeMember.id} updatedAt={activeMember.profileImage?.updatedAt} className="size-12" />
                <div className="min-w-0">
                  <h2 id={detailTitleId} className="text-xl font-bold tracking-[-0.035em]">{activeMember.name}</h2>
                  <p className="mt-1 break-all text-sm text-[var(--muted)]">{activeMember.email}</p>
                </div>
              </div>
              <UiButton
                type="button"
                aria-label="닫기"
                className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
                onClick={() => detailDialogRef.current?.close()}
              >
                <CloseIcon className="size-5" />
              </UiButton>
            </div>

            <dl className="mt-7 grid gap-x-8 gap-y-5 border-t border-[var(--line)] pt-6 text-sm sm:grid-cols-2">
              <MemberDetail label="학과" value={activeMember.department} />
              <MemberDetail label="학번" value={activeMember.studentNumber} />
              <MemberDetail label="학년" value={activeMember.grade ? `${activeMember.grade}학년` : null} />
              <MemberDetail label="자주 쓰는 이메일 주소" value={activeMember.contactEmail} breakAll />
            </dl>

            <MemberContacts
              phone={activeMember.profile?.phone || activeMember.phoneNumber || ""}
              kakao={activeMember.profile?.kakao ?? ""}
              github={activeMember.profile?.github ?? ""}
              instagram={activeMember.profile?.instagram ?? ""}
            />
          </div>
        ) : null}
      </dialog>

      <MembershipActionDialog
        dialogRef={membershipDialogRef}
        titleId={membershipTitleId}
        memberAction={memberAction}
        members={members}
        actorId={actorId}
        projectId={projectId}
        projectTeamId={projectTeamId}
        nextLeaderId={nextLeaderId}
        onNextLeaderChange={setNextLeaderId}
        action={action}
        pending={pending}
        state={state === stateAtActionOpen ? initialState : state}
        onClose={() => {
          setMemberAction(null);
          setNextLeaderId("");
        }}
      />
    </>
  );
}

function PeopleContent({
  advisorEnabled,
  professor,
  assistants,
  members,
  actorId,
  membershipChangesEnabled,
  canManageMembers,
  pending,
  onSelectMember,
  onMemberAction,
}: {
  advisorEnabled: boolean;
  professor: TeamWorkspace["professor"];
  assistants: TeamWorkspace["assistants"];
  members: TeamWorkspace["members"];
  actorId: string;
  membershipChangesEnabled: boolean;
  canManageMembers: boolean;
  pending: boolean;
  onSelectMember: (member: TeamMember) => void;
  onMemberAction: (action: Exclude<MemberAction, null>) => void;
}) {
  return (
    <div className="space-y-5">
      {advisorEnabled ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"><UiText>{"지도교수"}</UiText></p>
          <div className="mt-2 flex min-w-0 items-center gap-2.5">
            <PersonAvatar userId={professor.id} updatedAt={professor.profileImage?.updatedAt} className="size-8" />
            <p className="truncate text-sm font-semibold">{professor.name}</p>
          </div>
        </div>
      ) : null}

      {assistants.length ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"><UiText>{"조교"}</UiText></p>
          <UiUl aria-label="프로젝트 조교" className="mt-2 space-y-2">
            {assistants.map((assistant) => (
              <li key={assistant.id} className="flex min-w-0 items-center gap-2.5">
                <PersonAvatar userId={assistant.id} updatedAt={assistant.profileImage?.updatedAt} className="size-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{assistant.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{assistant.email}</p>
                </div>
              </li>
            ))}
          </UiUl>
        </div>
      ) : null}

      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          <UiText>{"팀원"}</UiText>{" "}{members.length}<UiText>{"명"}</UiText>
        </p>
        <UiUl aria-label="프로젝트 팀원" className="mt-2 space-y-1">
          {members.map((member) => (
            <li key={member.id} className="flex min-w-0 items-center gap-1">
              <UiButton
                type="button"
                aria-label={`${member.name} 상세 정보`}
                className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--primary-hover)]"
                onClick={() => onSelectMember(member)}
              >
                <PersonAvatar userId={member.id} updatedAt={member.profileImage?.updatedAt} className="size-7 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{member.name}</span>
                {member.role === "LEADER" ? (
                  <span className="shrink-0 rounded-md bg-[var(--primary-subtle)] px-1.5 py-0.5 text-[0.625rem] font-bold leading-4 text-[var(--primary-hover)]">
                    <UiText>{"팀장"}</UiText>
                  </span>
                ) : null}
              </UiButton>
              <MemberRowActions
                member={member}
                actorId={actorId}
                membershipChangesEnabled={membershipChangesEnabled}
                canManageMembers={canManageMembers}
                pending={pending}
                onMemberAction={onMemberAction}
              />
            </li>
          ))}
        </UiUl>
      </div>
    </div>
  );
}

function MemberRowActions({
  member,
  actorId,
  membershipChangesEnabled,
  canManageMembers,
  pending,
  onMemberAction,
}: {
  member: TeamMember;
  actorId: string;
  membershipChangesEnabled: boolean;
  canManageMembers: boolean;
  pending: boolean;
  onMemberAction: (action: Exclude<MemberAction, null>) => void;
}) {
  if (!membershipChangesEnabled) return null;
  const isSelf = member.id === actorId;
  const canLeave = isSelf;
  const canManageMember = canManageMembers;
  const quietActionClass = "button-quiet min-h-8 shrink-0 px-2 text-[0.6875rem]";

  if (member.role === "LEADER") {
    if (!canManageMember) return null;
    return (
      <UiButton
        type="button"
        disabled={pending}
        aria-label={`${member.name} ${isSelf ? "팀장 인계 후 탈퇴" : "팀장 인계 후 제외"}`}
        className={`${quietActionClass} text-[var(--danger)]`}
        onClick={() => onMemberAction({ kind: "REMOVE_LEADER", member })}
      >
        <UiText>{isSelf ? "탈퇴" : "제외"}</UiText>
      </UiButton>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {canManageMember ? (
        <UiButton
          type="button"
          disabled={pending}
          aria-label={`${member.name} 팀장 위임`}
          className={`${quietActionClass} text-[var(--primary)]`}
          onClick={() => onMemberAction({ kind: "TRANSFER", member })}
        >
          <UiText>{"위임"}</UiText>
        </UiButton>
      ) : null}
      {canManageMember || canLeave ? (
        <UiButton
          type="button"
          disabled={pending}
          aria-label={`${member.name} ${isSelf ? "프로젝트 팀 탈퇴" : "프로젝트 팀에서 제외"}`}
          className={`${quietActionClass} text-[var(--danger)]`}
          onClick={() => onMemberAction({ kind: isSelf ? "LEAVE" : "REMOVE", member })}
        >
          <UiText>{isSelf ? "탈퇴" : "제외"}</UiText>
        </UiButton>
      ) : null}
    </div>
  );
}

function MembershipActionDialog({
  dialogRef,
  titleId,
  memberAction,
  members,
  actorId,
  projectId,
  projectTeamId,
  nextLeaderId,
  onNextLeaderChange,
  action,
  pending,
  state,
  onClose,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  titleId: string;
  memberAction: MemberAction;
  members: TeamWorkspace["members"];
  actorId: string;
  projectId: string;
  projectTeamId: string;
  nextLeaderId: string;
  onNextLeaderChange: (nextLeaderId: string) => void;
  action: (payload: FormData) => void;
  pending: boolean;
  state: ProjectTeamMembershipActionState;
  onClose: () => void;
}) {
  const successorOptions = members
    .filter((member) => member.role === "MEMBER")
    .map((member) => ({ value: member.id, label: member.name }));
  const isLeaderRemoval = memberAction?.kind === "REMOVE_LEADER";
  const isSelfLeaderRemoval = isLeaderRemoval && memberAction.member.id === actorId;
  const copy = memberAction ? actionCopy(memberAction, isSelfLeaderRemoval) : null;
  const confirmDisabled = pending || (isLeaderRemoval && (!nextLeaderId || successorOptions.length === 0));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { if (pending) event.preventDefault(); }}
      onClose={onClose}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.18)] backdrop:bg-[rgba(23,32,51,.48)]"
    >
      {memberAction && copy ? (
        <form action={action}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="projectTeamId" value={projectTeamId} />
          <input type="hidden" name="intent" value={memberAction.kind} />
          {memberAction.kind !== "LEAVE" ? <input type="hidden" name="targetUserId" value={memberAction.member.id} /> : null}
          <header className="flex items-start justify-between gap-5 border-b border-[var(--line)] px-5 py-5 sm:px-6">
            <div>
              <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em]"><UiText>{copy.title}</UiText></h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{copy.description}</UiText></p>
            </div>
            <UiButton type="button" onClick={() => dialogRef.current?.close()} disabled={pending} aria-label="닫기" className="button-quiet min-w-11 shrink-0 px-0"><CloseIcon className="size-5" /></UiButton>
          </header>
          <div className="grid gap-4 px-5 py-5 sm:px-6">
            {isLeaderRemoval ? (
              successorOptions.length ? (
                <label className="grid gap-2 text-sm font-semibold">
                  <span><UiText>{"인계할 팀장"}</UiText></span>
                  <CustomSelect
                    name="nextLeaderId"
                    ariaLabel="인계할 팀장"
                    options={successorOptions}
                    value={nextLeaderId}
                    placeholder="새 팀장을 선택하세요"
                    required
                    disabled={pending}
                    onValueChange={onNextLeaderChange}
                  />
                </label>
              ) : (
                <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--danger)]"><UiText>{"인계할 팀원이 없어 팀장을 제거할 수 없습니다."}</UiText></p>
              )
            ) : null}
            {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <UiButton type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}><UiText>{"취소"}</UiText></UiButton>
            <UiButton type="submit" className={memberAction.kind === "TRANSFER" ? "button-primary" : "button-danger"} disabled={confirmDisabled}><UiText>{pending ? "처리 중" : copy.confirmLabel}</UiText></UiButton>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

function actionCopy(memberAction: Exclude<MemberAction, null>, selfLeaderRemoval: boolean) {
  if (memberAction.kind === "TRANSFER") {
    return {
      title: "팀장 위임",
      description: `${memberAction.member.name} 님에게 팀장 권한을 이전합니다.`,
      confirmLabel: "팀장 위임",
    };
  }
  if (memberAction.kind === "LEAVE") {
    return {
      title: "프로젝트 팀 탈퇴",
      description: "탈퇴하면 프로젝트 공간 접근 권한이 즉시 회수됩니다.",
      confirmLabel: "탈퇴",
    };
  }
  if (memberAction.kind === "REMOVE_LEADER") {
    return {
      title: selfLeaderRemoval ? "팀장 인계 후 탈퇴" : "팀장 인계 후 제외",
      description: `${memberAction.member.name} 님을 처리하기 전에 새 팀장을 선택해야 합니다.`,
      confirmLabel: selfLeaderRemoval ? "팀장 인계 후 탈퇴" : "팀장 인계 후 제외",
    };
  }
  return {
    title: "팀원 제외",
    description: `${memberAction.member.name} 님을 프로젝트 팀에서 제외하시겠습니까?`,
    confirmLabel: "제외",
  };
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
