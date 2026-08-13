"use client";

import { useActionState } from "react";

import {
  projectTeamMembershipAction,
  type ProjectTeamMembershipActionState,
} from "@/app/projects/[projectId]/_actions/project-team-membership-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { CustomSelect } from "@/shared/ui/custom-select";

const initialState: ProjectTeamMembershipActionState = { status: "idle", message: "" };

export function ProjectTeamMemberControls({
  projectId,
  projectTeamId,
  actorId,
  isAdmin,
  members,
}: {
  projectId: string;
  projectTeamId: string;
  actorId: string;
  isAdmin: boolean;
  members: Array<{ id: string; name: string; role: "LEADER" | "MEMBER" }>;
}) {
  const [state, action, pending] = useActionState(projectTeamMembershipAction, initialState);
  const current = members.find(({ id }) => id === actorId);
  const canManage = isAdmin || current?.role === "LEADER";
  return (
    <section className="mt-5 border-t border-[var(--line)] pt-5">
      <h2 className="text-sm font-bold"><UiText>{"팀원 관리"}</UiText></h2>
      {current?.role === "LEADER" ? (
        <form action={action} className="mt-3 flex gap-2">
          <CommonFields projectId={projectId} projectTeamId={projectTeamId} intent="TRANSFER" />
          <CustomSelect name="targetUserId" ariaLabel="새 팀장 선택" required placeholder="새 팀장 선택" className="min-w-0 flex-1" options={members.filter(({ role }) => role !== "LEADER").map((member) => ({ value: member.id, label: member.name }))} />
          <button disabled={pending} className="button-secondary text-xs"><UiText>{"팀장 이전"}</UiText></button>
        </form>
      ) : current ? (
        <form action={action} className="mt-3">
          <CommonFields projectId={projectId} projectTeamId={projectTeamId} intent="LEAVE" />
          <ConfirmSubmitButton disabled={pending} className="button-quiet text-xs text-[var(--danger)]" confirmMessage="프로젝트 팀에서 탈퇴하면 프로젝트 공간 접근 권한이 즉시 회수됩니다."><UiText>{"프로젝트 팀 탈퇴"}</UiText></ConfirmSubmitButton>
        </form>
      ) : null}
      {canManage ? (
        <ul className="mt-3 space-y-2">
          {members.filter(({ role }) => role !== "LEADER").map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold">{member.name}</span>
              <form action={action}>
                <CommonFields projectId={projectId} projectTeamId={projectTeamId} intent="REMOVE" />
                <input type="hidden" name="targetUserId" value={member.id} />
                <ConfirmSubmitButton disabled={pending} className="button-quiet text-xs text-[var(--danger)]" confirmMessage={`${member.name} 님을 프로젝트 팀에서 제외하시겠습니까?`}><UiText>{"제외"}</UiText></ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {state.message ? <p className={`mt-2 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
    </section>
  );
}

function CommonFields({ projectId, projectTeamId, intent }: {
  projectId: string;
  projectTeamId: string;
  intent: "LEAVE" | "REMOVE" | "TRANSFER";
}) {
  return <><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="projectTeamId" value={projectTeamId} /><input type="hidden" name="intent" value={intent} /></>;
}
