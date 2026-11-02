import { PersonAvatar } from "@/shared/ui/person-avatar";
import { Pill } from "@/modules/project-program/ui/work-screen";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";

/**
 * 개요 옆 칸의 구성원 명단.
 *
 * 누가 있는지만 보여 준다. 사람을 들이고 빼고 연락처를 보는 일은 팀 관리 탭에서 한다.
 * 좁은 자리에 손잡이를 몰아넣으면 이름이 밀려 읽기 어렵다.
 */
export function TeamRosterSummary({
  advisorEnabled,
  professor,
  assistants,
  members,
}: {
  advisorEnabled: boolean;
  professor: TeamWorkspace["professor"];
  assistants: TeamWorkspace["assistants"];
  members: TeamWorkspace["members"];
}) {
  const row = "flex min-w-0 items-center gap-2.5 py-1.5";
  const label = "text-[0.8125rem] text-[var(--muted)]";
  return (
    <div className="space-y-3 px-5 pb-4">
      {advisorEnabled ? (
        <div>
          <p className={label}><UiText>{"지도교수"}</UiText></p>
          <div className={row}>
            <PersonAvatar userId={professor.id} updatedAt={professor.profileImage?.updatedAt} className="size-7 shrink-0" />
            <p className="truncate text-sm">{professor.name}</p>
          </div>
        </div>
      ) : null}

      {assistants.length ? (
        <div>
          <p className={label}><UiText>{"조교"}</UiText></p>
          <UiUl aria-label="프로젝트 조교">
            {assistants.map((assistant) => (
              <li key={assistant.id} className={row}>
                <PersonAvatar userId={assistant.id} updatedAt={assistant.profileImage?.updatedAt} className="size-7 shrink-0" />
                <p className="truncate text-sm">{assistant.name}</p>
              </li>
            ))}
          </UiUl>
        </div>
      ) : null}

      <div>
        <p className={label}><UiText>{"팀원"}</UiText></p>
        {members.length ? (
          <UiUl aria-label="프로젝트 팀원">
            {members.map((member) => (
              <li key={member.id} className={row}>
                <PersonAvatar userId={member.id} updatedAt={member.profileImage?.updatedAt} className="size-7 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">{member.name}</span>
                {member.role === "LEADER" ? <Pill tone="accent">{"팀장"}</Pill> : null}
              </li>
            ))}
          </UiUl>
        ) : <p className="py-1.5 text-[0.8125rem] text-[var(--muted)]"><UiText>{"아직 팀원이 없습니다"}</UiText></p>}
      </div>
    </div>
  );
}
