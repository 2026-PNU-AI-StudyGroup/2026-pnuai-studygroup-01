import { ApplicationSectionHeader } from "@/app/topics/applications/_components/application-section-header";
import { CancelTeamApplicationDraftForm, TeamInvitationResponseForm } from "@/app/topics/applications/_components/team-invitation-controls";
import type { TeamApplicationDraftSummary, TeamApplicationInvitationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const dateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

const invitationPresentation = {
  PENDING: { label: "응답 대기", tone: "info" },
  ACCEPTED: { label: "참여 수락", tone: "success" },
  DECLINED: { label: "거절", tone: "danger" },
} as const;

export function ReceivedTeamInvitations({ invitations }: { invitations: TeamApplicationInvitationSummary[] }) {
  if (invitations.length === 0) return null;

  return (
    <section aria-labelledby="received-team-invitations" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
      <ApplicationSectionHeader eyebrow="내가 응답할 차례" title="받은 팀원 초대" titleId="received-team-invitations" count={invitations.length} />
      <ul>
        {invitations.map((invitation) => {
          const presentation = invitationPresentation[invitation.status];
          return (
            <li key={invitation.id} className="grid gap-5 border-b border-[var(--line)] px-6 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div>
                  <h3 className="text-lg font-extrabold">{invitation.topicTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">초대한 학생 · {invitation.leaderName} ({invitation.leaderEmail})</p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                  <time className="text-xs font-medium text-[var(--muted)]" dateTime={invitation.createdAt.toISOString()}>{dateTime.format(invitation.createdAt)}</time>
                </div>
              </div>
              {invitation.status === "PENDING" ? <TeamInvitationResponseForm invitationId={invitation.id} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function invitationStatusLabel(status: TeamApplicationDraftSummary["invitations"][number]["status"]): string {
  if (status === "ACCEPTED") return "수락";
  if (status === "DECLINED") return "거절";
  return "대기";
}

export function TeamApplicationDrafts({ drafts }: { drafts: TeamApplicationDraftSummary[] }) {
  if (drafts.length === 0) return null;

  return (
    <section aria-labelledby="team-application-drafts" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
      <ApplicationSectionHeader eyebrow="전원 수락 전" title="준비 중인 팀 지원" titleId="team-application-drafts" count={drafts.length} />
      <ul>
        {drafts.map((draft) => (
          <li key={draft.id} className="grid gap-5 border-b border-[var(--line)] px-6 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7">
            <div>
              <h3 className="text-lg font-extrabold">{draft.topicTitle}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{dateTime.format(draft.createdAt)} 초대</p>
              <ul aria-label="팀원 초대 상태" className="mt-4 grid gap-2 sm:grid-cols-2">
                {draft.invitations.map((invitation) => (
                  <li key={invitation.email} className="flex min-w-0 items-center gap-2 text-sm">
                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${invitation.status === "ACCEPTED" ? "bg-[var(--success)]" : invitation.status === "DECLINED" ? "bg-[var(--danger)]" : "bg-[var(--line-strong)]"}`} />
                    <span className="min-w-0 truncate font-semibold">{invitation.email}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{invitationStatusLabel(invitation.status)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <CancelTeamApplicationDraftForm draftId={draft.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
