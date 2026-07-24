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
    <section aria-labelledby="received-team-invitations" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]">
      <ApplicationSectionHeader eyebrow="내가 응답할 차례" title="받은 팀원 초대" titleId="received-team-invitations" count={invitations.length} />
      <ul className="divide-y divide-[var(--line)]">
        {invitations.map((invitation) => {
          const presentation = invitationPresentation[invitation.status];
          return (
            <li key={invitation.id} className="record-row grid gap-5 px-6 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                  <span className="text-xs font-medium text-[var(--muted)]">{dateTime.format(invitation.createdAt)}</span>
                </div>
                <h3 className="mt-3 text-lg font-extrabold">{invitation.topicTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">초대한 학생 · {invitation.leaderName} ({invitation.leaderEmail})</p>
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
    <section aria-labelledby="team-application-drafts" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]">
      <ApplicationSectionHeader eyebrow="전원 수락 전" title="준비 중인 팀 지원" titleId="team-application-drafts" count={drafts.length} />
      <ul className="divide-y divide-[var(--line)]">
        {drafts.map((draft) => (
          <li key={draft.id} className="record-row grid gap-5 px-6 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <h3 className="text-lg font-extrabold">{draft.topicTitle}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{dateTime.format(draft.createdAt)} 초대</p>
              <ul aria-label="팀원 초대 상태" className="mt-4 flex flex-wrap gap-2">
                {draft.invitations.map((invitation) => (
                  <li key={invitation.email}>
                    <StatusBadge tone={invitation.status === "ACCEPTED" ? "success" : invitation.status === "DECLINED" ? "danger" : "neutral"}>
                      {invitation.email} · {invitationStatusLabel(invitation.status)}
                    </StatusBadge>
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
