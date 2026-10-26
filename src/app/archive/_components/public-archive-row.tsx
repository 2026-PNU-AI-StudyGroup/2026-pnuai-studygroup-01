import type { ReactNode } from "react";

import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";
import { parseGithubRepo } from "@/modules/team/domain/showcase-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { markdownToPlainText } from "@/shared/ui/render-markdown";
import { ExternalLinkIcon } from "@/shared/ui/workspace-icons";

const rowLayout = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto_1rem]";

/**
 * 공개 아카이브의 한 줄.
 *
 * 평가위원이 스크롤 없이 한 사업을 훑도록 한 팀을 한 줄에 담는다. 줄 전체가 저장소 링크라
 * 작은 버튼을 찾을 필요가 없다. 어느 저장소로 가는지는 마우스를 올리면 주소로 보인다.
 */
export function ArchiveRow({ href, lead, title, summary, badge }: {
  href: string | null;
  lead: ReactNode;
  title: ReactNode;
  summary?: string;
  badge?: string | null;
}) {
  const content = (
    <>
      <p className="col-span-2 truncate text-xs font-semibold text-[var(--muted)] sm:col-span-1 sm:text-sm">{lead}</p>
      <p className="min-w-0 truncate text-sm sm:text-[0.9375rem]">
        <span className="font-semibold text-[var(--ink)]">{title}</span>
        {summary ? <span className="ms-2 text-[var(--muted)]">{summary}</span> : null}
      </p>
      <span className="flex justify-end">
        {badge ? (
          <span className="whitespace-nowrap rounded-full bg-[var(--accent-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-ink)]">{badge}</span>
        ) : null}
      </span>
      {href ? (
        <span className="hidden text-[var(--muted)] transition-colors group-hover:text-[var(--primary)] sm:block">
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
          <span className="sr-only"><UiText>{"새 창에서 열림"}</UiText></span>
        </span>
      ) : <span className="hidden sm:block" />}
    </>
  );
  if (!href) return <div className={rowLayout}>{content}</div>;
  const repo = parseGithubRepo(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={repo ? `github.com/${repo.owner}/${repo.repo}` : href.replace(/^https?:\/\//, "")}
      className={`${rowLayout} group transition-colors hover:bg-[var(--surface-subtle)] focus-visible:relative focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]`}
    >
      {content}
    </a>
  );
}

/**
 * 대회 하나를 담는 판.
 *
 * 머리줄에 연도와 대회명을 나란히 둔다. 어느 해 어느 대회인지가 목록보다 먼저 읽혀야
 * 평가위원이 길을 잃지 않는다. 줄 사이는 가는 선으로만 나눈다.
 */
export function ArchivePanel({ year, name, count, children }: {
  year?: number;
  name: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <h2 className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
        {year ? (
          <span className="rounded-[var(--radius-control)] bg-[var(--primary)] px-2 py-0.5 text-sm font-bold tabular-nums text-white">{year}</span>
        ) : null}
        <span className="min-w-0 text-base font-bold leading-snug tracking-[-0.02em] text-[var(--ink)] sm:truncate">{name}</span>
        {count !== undefined ? (
          <span className="ms-auto shrink-0 text-sm font-medium tabular-nums text-[var(--muted)]"><UiText>{`${count}개 팀`}</UiText></span>
        ) : null}
      </h2>
      <ul className="divide-y divide-[var(--line)]">{children}</ul>
    </div>
  );
}

export function PublicArchiveRow({ project }: { project: PublicArchivedProject }) {
  // 카테캠처럼 팀 이름이 "5팀", "10조" 인 사업은 이름이 곧 번호다. 번호와 "팀" 을 또 붙이면 "5. 5팀 팀" 이 된다.
  const numberedName = /[팀조]$/.test(project.teamName);
  const teamLabel = project.teamNumber === null || numberedName ? project.teamName : `${project.teamNumber}. ${project.teamName}`;
  return (
    <li>
      <ArchiveRow
        href={project.repositoryUrl}
        lead={numberedName ? teamLabel : <>{teamLabel} <UiText>{"팀"}</UiText></>}
        title={project.title}
        // 소개가 마크다운일 수 있어서 미리보기에서는 문법 기호를 걷어낸다.
        summary={markdownToPlainText(project.description)}
        badge={project.award}
      />
    </li>
  );
}
