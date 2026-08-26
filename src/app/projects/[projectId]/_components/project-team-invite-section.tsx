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

const initialState: ProjectTeamInvitationActionState = { status: "idle", message: "" };

/**
 * 확정된 프로젝트 팀에 뒤늦게 사람을 부르는 자리.
 *
 * 팀원 목록 바로 아래에 둔다. 사람을 빼는 일과 들이는 일이 같은 곳에 있어야 찾는다.
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
    <div className="border-t border-[var(--line)] pt-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        <UiText>{"팀원 초대"}</UiText>
      </p>

      <form action={action} className="mt-2 grid gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="projectTeamId" value={projectTeamId} />
        <UiInput
          type="email"
          name="email"
          required
          maxLength={200}
          placeholder="student@pusan.ac.kr"
          aria-label="초대할 부산대학교 이메일"
          className="form-control text-sm"
        />
        <UiButton type="submit" className="button-secondary text-sm" disabled={pending}>
          <UiText>{pending ? "보내는 중" : "초대 보내기"}</UiText>
        </UiButton>
      </form>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-2 text-xs font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}

      {invitations.length ? (
        <UiUl aria-label="보낸 초대" className="mt-3 space-y-1.5">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">
                {invitation.inviteeName ?? invitation.email}
                <span className="ml-1.5 rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[0.625rem] font-bold">
                  <UiText>{"응답 대기"}</UiText>
                </span>
              </span>
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
      <UiButton type="submit" className="text-xs font-semibold text-[var(--danger)]" disabled={pending}>
        <UiText>{"철회"}</UiText>
      </UiButton>
      {state.status === "error" ? (
        <span role="alert" className="sr-only"><UiText>{state.message}</UiText></span>
      ) : null}
    </form>
  );
}
