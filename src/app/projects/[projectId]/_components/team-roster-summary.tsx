import { PersonAvatar } from "@/shared/ui/person-avatar";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink, UiUl } from "@/modules/translation/ui/localized-elements";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";

/**
 * 사이드바에 두는 구성원 명단.
 *
 * 누가 있는지만 보여 준다. 사람을 들이고 빼고 연락처를 보는 일은 팀 관리 탭에서 한다.
 * 좁은 자리에 손잡이를 몰아넣으면 이름이 밀려 읽기 어렵다.
 */
export function TeamRosterSummary({
  projectId,
  advisorEnabled,
  professor,
  assistants,
  members,
}: {
  projectId: string;
  advisorEnabled: boolean;
  professor: TeamWorkspace["professor"];
  assistants: TeamWorkspace["assistants"];
  members: TeamWorkspace["members"];
}) {
  return (
    <div className="mt-7 space-y-5 border-t border-[var(--line)] pt-5">
      {advisorEnabled ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <UiText>{"지도교수"}</UiText>
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2.5">
            <PersonAvatar userId={professor.id} updatedAt={professor.profileImage?.updatedAt} className="size-8" />
            <p className="truncate text-sm font-semibold">{professor.name}</p>
          </div>
        </div>
      ) : null}

      {assistants.length ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <UiText>{"조교"}</UiText>
          </p>
          <UiUl aria-label="프로젝트 조교" className="mt-2 space-y-2">
            {assistants.map((assistant) => (
              <li key={assistant.id} className="flex min-w-0 items-center gap-2.5">
                <PersonAvatar userId={assistant.id} updatedAt={assistant.profileImage?.updatedAt} className="size-8" />
                <p className="truncate text-sm font-semibold">{assistant.name}</p>
              </li>
            ))}
          </UiUl>
        </div>
      ) : null}

      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          <UiText>{"팀원"}</UiText>{" "}{members.length}<UiText>{"명"}</UiText>
        </p>
        <UiUl aria-label="프로젝트 팀원" className="mt-2 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar userId={member.id} updatedAt={member.profileImage?.updatedAt} className="size-7 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.name}</span>
              {member.role === "LEADER" ? (
                <span className="shrink-0 rounded-md bg-[var(--primary-subtle)] px-1.5 py-0.5 text-[0.625rem] font-bold leading-4 text-[var(--primary-hover)]">
                  <UiText>{"팀장"}</UiText>
                </span>
              ) : null}
            </li>
          ))}
        </UiUl>
        <UiLink
          href={`/projects/${projectId}/team`}
          className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]"
        >
          <UiText>{"팀 관리로 이동"}</UiText>
        </UiLink>
      </div>
    </div>
  );
}
