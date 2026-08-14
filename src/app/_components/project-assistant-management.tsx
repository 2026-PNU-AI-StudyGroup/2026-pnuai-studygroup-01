import {
  CancelProjectAssistantInvitationForm,
  InviteProjectAssistantForm,
  RemoveProjectAssistantForm,
} from "@/app/_components/project-assistant-controls";
import type { ProjectAssistantManagement } from "@/modules/project-assistant/application/project-assistant-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const roleLabel = {
  STUDENT: "학생",
  PROFESSOR: "교수",
  ADMIN: "관리자",
  ADVISOR: "자문위원",
} as const;

export function ProjectAssistantManagementPanel({
  management,
}: {
  management: ProjectAssistantManagement;
}) {
  return (
    <section aria-labelledby="project-assistants-title" className="space-y-5 border-t border-[var(--line)] pt-7">
      <div>
        <h2 id="project-assistants-title" className="text-xl font-bold"><UiText>{"조교 관리"}</UiText></h2>
        <p className="muted mt-1 text-sm"><UiText>{"초대를 수락한 조교는 계정 역할과 관계없이 이 프로젝트의 관리 권한을 갖습니다."}</UiText></p>
      </div>
      <InviteProjectAssistantForm topicId={management.topicId} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold"><UiText>{"현재 조교"}</UiText>{" "}{management.assistants.length}<UiText>{"명"}</UiText></h3>
          {management.assistants.length ? (
            <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {management.assistants.map((assistant) => (
                <li key={assistant.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <strong>{assistant.name}</strong>
                    <p className="muted text-sm">{assistant.email} · <UiText>{roleLabel[assistant.role]}</UiText></p>
                  </div>
                  <RemoveProjectAssistantForm topicId={management.topicId} assistantUserId={assistant.userId} assistantName={assistant.name} />
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-3 text-sm"><UiText>{"등록된 조교가 없습니다."}</UiText></p>}
        </div>
        <div>
          <h3 className="text-sm font-bold"><UiText>{"응답 대기"}</UiText>{" "}{management.pendingInvitations.length}<UiText>{"명"}</UiText></h3>
          {management.pendingInvitations.length ? (
            <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {management.pendingInvitations.map((invitation) => (
                <li key={invitation.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <strong>{invitation.inviteeName}</strong>
                    <p className="muted text-sm">{invitation.inviteeEmail} · <UiText>{roleLabel[invitation.inviteeRole]}</UiText></p>
                  </div>
                  <CancelProjectAssistantInvitationForm topicId={management.topicId} invitationId={invitation.id} inviteeName={invitation.inviteeName} />
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-3 text-sm"><UiText>{"응답을 기다리는 초대가 없습니다."}</UiText></p>}
        </div>
      </div>
    </section>
  );
}
