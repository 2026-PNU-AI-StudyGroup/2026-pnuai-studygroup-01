import {
  cancelProjectAssistantInvitationAction,
  removeProjectAssistantAction,
} from "@/app/_actions/project-assistant-actions";
import { InviteProjectAssistantForm } from "@/modules/project-assistant/ui/project-assistant-controls";
import type { ProjectAssistantManagement } from "@/modules/project-assistant/application/project-assistant-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const roleLabel = {
  STUDENT: "학생",
  PROFESSOR: "교수",
  ADMIN: "관리자",
} as const;

export function ProjectAssistantManagementPanel({
  management,
}: {
  management: ProjectAssistantManagement;
}) {
  return (
    <section aria-labelledby="project-assistants-title" className="space-y-5 border-t border-[var(--line)] pt-7">
      <div>
        <p className="eyebrow"><UiText>{"프로젝트 권한"}</UiText></p>
        <h2 id="project-assistants-title" className="mt-1 text-xl font-extrabold"><UiText>{"조교 관리"}</UiText></h2>
        <p className="muted mt-1 text-sm"><UiText>{management.advisorEnabled ? "초대를 수락한 조교는 계정 역할과 관계없이 이 프로젝트에서 지도교수와 동일한 운영 권한을 갖습니다." : "초대를 수락한 조교는 계정 역할과 관계없이 이 프로젝트의 운영 권한을 갖습니다."}</UiText></p>
      </div>
      <InviteProjectAssistantForm topicId={management.topicId} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-extrabold"><UiText>{"현재 조교"}</UiText>{" "}{management.assistants.length}<UiText>{"명"}</UiText></h3>
          {management.assistants.length ? (
            <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {management.assistants.map((assistant) => (
                <li key={assistant.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <strong>{assistant.name}</strong>
                    <p className="muted text-sm">{assistant.email} · <UiText>{roleLabel[assistant.role]}</UiText></p>
                  </div>
                  <form action={removeProjectAssistantAction}>
                    <input type="hidden" name="topicId" value={management.topicId} />
                    <input type="hidden" name="assistantUserId" value={assistant.userId} />
                    <ConfirmSubmitButton className="button-quiet" confirmMessage={`${assistant.name}님의 프로젝트 조교 권한을 해제하시겠습니까?`}>
                      <UiText>{"권한 해제"}</UiText>
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-3 text-sm"><UiText>{"등록된 조교가 없습니다."}</UiText></p>}
        </div>
        <div>
          <h3 className="text-sm font-extrabold"><UiText>{"응답 대기"}</UiText>{" "}{management.pendingInvitations.length}<UiText>{"명"}</UiText></h3>
          {management.pendingInvitations.length ? (
            <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {management.pendingInvitations.map((invitation) => (
                <li key={invitation.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <strong>{invitation.inviteeName}</strong>
                    <p className="muted text-sm">{invitation.inviteeEmail} · <UiText>{roleLabel[invitation.inviteeRole]}</UiText></p>
                  </div>
                  <form action={cancelProjectAssistantInvitationAction}>
                    <input type="hidden" name="topicId" value={management.topicId} />
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <button className="button-quiet" type="submit"><UiText>{"초대 취소"}</UiText></button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-3 text-sm"><UiText>{"응답을 기다리는 초대가 없습니다."}</UiText></p>}
        </div>
      </div>
    </section>
  );
}
