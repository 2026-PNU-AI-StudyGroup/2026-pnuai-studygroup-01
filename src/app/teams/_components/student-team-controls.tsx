"use client";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  createStudentTeamAction,
  deleteStudentTeamAction,
  inviteStudentTeamMemberAction,
  leaveStudentTeamAction,
  removeStudentTeamMemberAction,
  respondStudentTeamInvitationAction,
  transferStudentTeamLeadershipAction,
} from "@/app/teams/_actions/student-team-actions";
import type { StudentTeamActionState } from "@/app/teams/_actions/student-team-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { TextInput } from "@/shared/ui/form-system";

const initialStudentTeamActionState: StudentTeamActionState = { status: "idle", message: "" };

function ActionMessage({ state }: { state: { status: "idle" | "success" | "error"; message: string } }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p>;
}

export function CreateStudentTeamForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createStudentTeamAction, initialStudentTeamActionState);
  useEffect(() => {
    if (state.status === "success" && state.teamId) router.replace(`/teams/manage/${state.teamId}`);
  }, [router, state.status, state.teamId]);
  return (
    <form action={action} className="grid gap-4" aria-busy={pending}>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"팀 이름"}</UiText><UiInput className="form-control" name="name" required maxLength={80} placeholder="예: 코드웨이브" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"팀 소개"}</UiText><UiTextarea className="form-control" name="description" rows={3} maxLength={1000} placeholder="팀의 주제나 활동 계획을 간단히 입력하세요." /></label>
      <button className="button-primary justify-self-start" type="submit" disabled={pending}><UiText>{pending ? "만드는 중" : "내 팀 만들기"}</UiText></button>
      <ActionMessage state={state} />
    </form>
  );
}

export function InviteStudentTeamMemberForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(inviteStudentTeamMemberAction, initialStudentTeamActionState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      <label className="grid gap-2 text-sm font-semibold"><span><UiText>{"이메일로 초대"}</UiText></span><TextInput type="email" name="email" required placeholder="student@pusan.ac.kr" /></label>
      <button className="button-primary self-end" type="submit" disabled={pending}><UiText>{pending ? "보내는 중" : "초대 보내기"}</UiText></button>
      <div className="sm:col-span-2"><ActionMessage state={state} /></div>
    </form>
  );
}

export function InvitationDecisionForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(respondStudentTeamInvitationAction, initialStudentTeamActionState);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2" aria-busy={pending}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="button-secondary" name="decision" value="DECLINE" type="submit" disabled={pending}><UiText>{"거절"}</UiText></button>
      <button className="button-primary" name="decision" value="ACCEPT" type="submit" disabled={pending}><UiText>{"팀 참여"}</UiText></button>
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
        <ConfirmSubmitButton className="button-quiet" disabled={transferring} confirmMessage={`${studentName} 님에게 팀장을 이전하시겠습니까?`}><UiText>{"팀장 위임"}</UiText></ConfirmSubmitButton>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="studentId" value={studentId} />
        <ConfirmSubmitButton className="button-quiet text-[var(--danger)]" disabled={removing} confirmMessage={`${studentName} 님을 팀에서 내보내시겠습니까?`}><UiText>{"내보내기"}</UiText></ConfirmSubmitButton>
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
      <ConfirmSubmitButton className="button-quiet justify-self-start text-[var(--danger)]" disabled={pending} confirmMessage={`${teamName} 팀을 삭제하시겠습니까? 완료된 프로젝트 기록은 삭제되지 않습니다.`}><UiText>{"팀 삭제"}</UiText></ConfirmSubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function LeaveStudentTeamForm({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [state, action, pending] = useActionState(leaveStudentTeamAction, initialStudentTeamActionState);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <ConfirmSubmitButton className="button-quiet justify-self-start text-[var(--danger)]" disabled={pending} confirmMessage={`${teamName} 팀에서 탈퇴하시겠습니까? 대기 중인 프로젝트 제안은 취소됩니다.`}><UiText>{"팀 탈퇴"}</UiText></ConfirmSubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
