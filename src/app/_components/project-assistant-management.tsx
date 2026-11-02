import {
  CancelProjectAssistantInvitationForm,
  InviteProjectAssistantForm,
  RemoveProjectAssistantForm,
} from "@/app/_components/project-assistant-controls";
import type { ProjectAssistantManagement } from "@/modules/project-assistant/application/project-assistant-ports";
import { cardClass, CardHead, Pill } from "@/modules/project-program/ui/work-screen";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const roleLabel = {
  STUDENT: "학생",
  PROFESSOR: "교수",
  ADMIN: "관리자",
  ADVISOR: "자문위원",
} as const;

// 공용 해제, 취소 버튼(button-quiet)을 줄 안의 낮은 글자 버튼으로 줄인다.
const rowActionClass = "flex justify-end [&_.button-quiet]:min-h-8 [&_.button-quiet]:px-2.5 [&_.button-quiet]:py-1 [&_.button-quiet]:text-[0.8125rem] [&_.button-quiet]:font-medium";

/**
 * 조교 화면 본문. 왼쪽은 조교와 응답 대기 초대를 한 표에, 오른쪽은 초대 양식.
 * 같은 사람이 두 목록에 걸쳐 있지 않아 상태 알약 하나로 구분한다.
 */
export function ProjectAssistantManagementPanel({
  management,
}: {
  management: ProjectAssistantManagement;
}) {
  const rows = [
    ...management.assistants.map((assistant) => ({
      key: assistant.id,
      name: assistant.name,
      email: assistant.email,
      role: assistant.role,
      pending: false,
      action: <RemoveProjectAssistantForm topicId={management.topicId} assistantUserId={assistant.userId} assistantName={assistant.name} />,
    })),
    ...management.pendingInvitations.map((invitation) => ({
      key: invitation.id,
      name: invitation.inviteeName,
      email: invitation.inviteeEmail,
      role: invitation.inviteeRole,
      pending: true,
      action: <CancelProjectAssistantInvitationForm topicId={management.topicId} invitationId={invitation.id} inviteeName={invitation.inviteeName} />,
    })),
  ];

  return (
    <div className="grid items-start gap-3.5 @min-[64rem]:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="project-assistants-title" className={cardClass}>
        <CardHead
          id="project-assistants-title"
          title={<UiText>{"조교"}</UiText>}
          count={<><UiText>{"현재 조교"}</UiText> {management.assistants.length}<UiText>{"명"}</UiText>, <UiText>{"응답 대기"}</UiText> {management.pendingInvitations.length}<UiText>{"명"}</UiText></>}
        />
        {rows.length ? (
          <ul>
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-[var(--line)] px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_5rem_auto]">
                <div className="min-w-0 leading-5">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{row.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{row.email}</p>
                </div>
                <span className="hidden text-[0.8125rem] text-[var(--muted)] sm:block"><UiText>{roleLabel[row.role]}</UiText></span>
                <span className="hidden sm:block">{row.pending ? <Pill tone="warning">{"응답 대기"}</Pill> : <Pill>{"조교"}</Pill>}</span>
                <div className={rowActionClass}>{row.action}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
            <span className="block font-medium text-[var(--ink)]"><UiText>{"등록된 조교가 없습니다"}</UiText></span>
            <span className="mt-0.5 block text-[var(--muted)]"><UiText>{"초대한 조교가 수락하면 이 목록에 표시됩니다."}</UiText></span>
          </p>
        )}
      </section>

      <section aria-labelledby="project-assistant-invite-title" className={cardClass}>
        <CardHead id="project-assistant-invite-title" title={<UiText>{"조교 초대"}</UiText>} />
        <div className="grid gap-4 px-5 pb-5">
          <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"초대를 수락한 조교는 계정 역할과 관계없이 이 프로젝트의 관리 권한을 갖습니다."}</UiText></p>
          {/* 좁은 칸이라 입력과 버튼을 위아래로 둔다. */}
          <div className="[&_form]:grid-cols-1 [&_form>button]:justify-self-end [&_form>button]:min-h-[2.125rem] [&_form>button]:px-3 [&_form>button]:py-1 [&_form>button]:text-[0.8125rem]">
            <InviteProjectAssistantForm topicId={management.topicId} />
          </div>
        </div>
      </section>
    </div>
  );
}
