"use client";

import { useActionState } from "react";

import {
  cancelProjectTeamInvitationAction,
  inviteProjectTeamMemberAction,
  type ProjectTeamInvitationActionState,
} from "@/app/_actions/project-team-invitation-actions";
import type { ProjectTeamInvitationSummary } from "@/modules/project-team/application/project-team-invitation-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton, UiInput, UiUl } from "@/modules/translation/ui/localized-elements";
import { Pill } from "@/modules/project-program/ui/work-screen";

const initialState: ProjectTeamInvitationActionState = { status: "idle", message: "" };

/**
 * 확정된 프로젝트 팀에 뒤늦게 사람을 부르는 자리.
 *
 * 팀 관리 화면에서 팀원 표 옆 칸에 둔다. 사람을 빼는 일과 들이는 일이 한 화면에 있어야 찾는다.
 */
export function ProjectTeamInviteSection({
  projectId,
  projectTeamId,
  invitations,
}: {
  projectId: string;
  projectTeamId: string;
  invitations: ProjectTeamInvitationSummary[];
}) {
  const [state, action, pending] = useActionState(inviteProjectTeamMemberAction, initialState);

  return (
    <div className="px-5 pb-4">
      <form action={action} className="grid gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="projectTeamId" value={projectTeamId} />
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          <UiText>{"부산대학교 이메일"}</UiText>
          <UiInput
            type="email"
            name="email"
            required
            maxLength={200}
            placeholder="student@pusan.ac.kr"
            aria-label="초대할 부산대학교 이메일"
            className="form-control min-h-10 py-2 text-sm"
          />
        </label>
        <UiButton type="submit" className="button-secondary button-compact min-h-8 px-3 font-medium justify-self-end" disabled={pending}>
          <UiText>{pending ? "보내는 중" : "초대 보내기"}</UiText>
        </UiButton>
      </form>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-2 text-[0.8125rem] font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}

      {invitations.length ? (
        <UiUl aria-label="보낸 초대" className="mt-3 border-t border-[var(--line)] pt-1">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="flex min-h-9 min-w-0 items-center gap-2 text-[0.8125rem]">
              <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{invitation.inviteeName ?? invitation.email}</span>
              <Pill tone="warning">{"응답 대기"}</Pill>
              <CancelInvitationButton projectId={projectId} invitationId={invitation.id} />
            </li>
          ))}
        </UiUl>
      ) : null}
    </div>
  );
}

function CancelInvitationButton({ projectId, invitationId }: { projectId: string; invitationId: string }) {
  const [state, action, pending] = useActionState(cancelProjectTeamInvitationAction, initialState);
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <UiButton type="submit" className="inline-flex min-h-8 items-center px-1 text-[0.8125rem] font-medium text-[var(--danger)] hover:underline hover:underline-offset-[3px]" disabled={pending}>
        <UiText>{"철회"}</UiText>
      </UiButton>
      {state.status === "error" ? (
        <span role="alert" className="sr-only"><UiText>{state.message}</UiText></span>
      ) : null}
    </form>
  );
}
