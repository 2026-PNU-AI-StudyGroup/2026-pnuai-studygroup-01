import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { GithubIcon } from "@/shared/ui/github-icon";

export function PublicArchiveCard({ project }: { project: PublicArchivedProject }) {
  const teamLabel = project.teamNumber === null ? project.teamName : `${project.teamNumber}. ${project.teamName}`;
  // 지난 프로젝트 소개는 마크다운으로 적힌 것이 있다. 두 줄 미리보기에 "#" 이나 "**" 가 그대로 보이지 않게 걷어낸다.
  const summary = project.description.replace(/^\s*#{1,6}\s+/gm, "").replace(/\*\*|__/g, "").trim();
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold leading-snug tracking-[-0.02em] [overflow-wrap:anywhere]">{project.title}</h4>
        {project.award ? (
          <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-ink)]">
            {project.award}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
        {teamLabel} <UiText>{"팀"}</UiText>
      </p>
      {summary ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)] [overflow-wrap:anywhere]">{summary}</p>
      ) : null}
      {project.repositoryUrl ? (
        <div className="mt-auto pt-4">
          <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className="button-secondary inline-flex items-center gap-2">
            <GithubIcon className="size-4 shrink-0" />
            <UiText>{"GitHub에서 보기"}</UiText>
          </a>
        </div>
      ) : null}
    </article>
  );
}
