"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  createStudentTeamAction,
  deleteStudentTeamAction,
  inviteStudentTeamMemberAction,
  removeStudentTeamMemberAction,
  respondStudentTeamInvitationAction,
  transferStudentTeamLeadershipAction,
} from "@/app/teams/_actions/student-team-actions";
import type { StudentTeamActionState } from "@/app/teams/_actions/student-team-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialStudentTeamActionState: StudentTeamActionState = { status: "idle", message: "" };

function ActionMessage({ state }: { state: { status: "idle" | "success" | "error"; message: string } }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p>;
}

export function CreateStudentTeamForm({ successHref }: { successHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStudentTeamAction, initialStudentTeamActionState);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);
  return (
    <form action={action} className="grid gap-4" aria-busy={pending}>
      <label className="grid gap-2 text-sm font-bold">팀 이름<input className="field" name="name" required maxLength={80} placeholder="예: 코드웨이브" /></label>
      <label className="grid gap-2 text-sm font-bold">팀 소개<textarea className="field" name="description" rows={3} maxLength={1000} placeholder="관심 분야와 협업 방식을 간단히 적어주세요." /></label>
      <button className="button-primary justify-self-start" type="submit" disabled={pending}>{pending ? "만드는 중" : "내 팀 만들기"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

export function InviteStudentTeamMemberForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(inviteStudentTeamMemberAction, initialStudentTeamActionState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      <label className="grid gap-2 text-sm font-bold"><span>이메일로 바로 초대</span><input className="field" type="email" name="email" required placeholder="student@pusan.ac.kr" /></label>
      <button className="button-primary self-end" type="submit" disabled={pending}>{pending ? "보내는 중" : "초대 보내기"}</button>
      <div className="sm:col-span-2"><ActionMessage state={state} /></div>
    </form>
  );
}

export function InvitationDecisionForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(respondStudentTeamInvitationAction, initialStudentTeamActionState);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2" aria-busy={pending}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="button-secondary" name="decision" value="DECLINE" type="submit" disabled={pending}>거절</button>
      <button className="button-primary" name="decision" value="ACCEPT" type="submit" disabled={pending}>팀 참여</button>
      <ActionMessage state={state} />
    </form>
  );
}

export function TeamMemberActions({ teamId, studentId, studentName }: { teamId: string; studentId: string; studentName: string }) {
  const [transferState, transferAction, transferring] = useActionState(transferStudentTeamLeadershipAction, initialStudentTeamActionState);
  const [removeState, removeAction, removing] = useActionState(removeStudentTeamMemberAction, initialStudentTeamActionState);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <form action={transferAction}>
        <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="nextLeaderId" value={studentId} />
        <ConfirmSubmitButton className="button-quiet" disabled={transferring} confirmMessage={`${studentName} 님에게 팀장을 이전할까요?`}>팀장 위임</ConfirmSubmitButton>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="studentId" value={studentId} />
        <ConfirmSubmitButton className="button-quiet text-[var(--danger)]" disabled={removing} confirmMessage={`${studentName} 님을 팀에서 내보낼까요?`}>내보내기</ConfirmSubmitButton>
      </form>
      <ActionMessage state={transferState.message ? transferState : removeState} />
    </div>
  );
}

export function DeleteStudentTeamForm({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [state, action, pending] = useActionState(deleteStudentTeamAction, initialStudentTeamActionState);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <ConfirmSubmitButton className="button-quiet justify-self-start text-[var(--danger)]" disabled={pending} confirmMessage={`${teamName} 팀을 삭제할까요? 프로젝트 아카이브는 유지됩니다.`}>팀 삭제</ConfirmSubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
