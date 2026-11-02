import type { ReactNode } from "react";

import { Odometer } from "@/app/_components/odometer";
import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";
import { parseGithubRepo } from "@/modules/team/domain/showcase-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { markdownToPlainText } from "@/shared/ui/render-markdown";
import { ExternalLinkIcon } from "@/shared/ui/workspace-icons";

import styles from "./archive.module.css";

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
      <span className={styles.lead}>{lead}</span>
      <span className={styles.title}>
        <strong>{title}</strong>
        {summary ? <span>{summary}</span> : null}
      </span>
      <span className={styles.badgeSlot}>
        {badge ? <span className={styles.badge} data-top={badge === "대상" || undefined}>{badge}</span> : null}
      </span>
      {href ? (
        <span className={styles.go}>
          <ExternalLinkIcon aria-hidden="true" />
          <span className="sr-only"><UiText>{"새 창에서 열림"}</UiText></span>
        </span>
      ) : <span className={styles.go} />}
    </>
  );
  if (!href) return <div className={styles.row}>{content}</div>;
  const repo = parseGithubRepo(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={repo ? `github.com/${repo.owner}/${repo.repo}` : href.replace(/^https?:\/\//, "")}
      className={styles.row}
    >
      {content}
    </a>
  );
}

/**
 * 대회 하나. 대회명과 팀 수가 목록보다 먼저 읽혀야 평가위원이 길을 잃지 않는다.
 * 줄 사이는 선 대신 한 줄 걸러 옅은 면으로 나눈다.
 */
export function ArchivePanel({ id, name, count, children }: {
  id: string;
  name: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className={styles.program} aria-labelledby={id}>
      <h3 id={id} className={styles.programHead} data-reveal="0">
        <span>{name}</span>
        {count !== undefined ? (
          <span className={styles.programCount}><Odometer value={count} /><UiText>{"개 팀"}</UiText></span>
        ) : null}
      </h3>
      <ul className={styles.rows}>{children}</ul>
    </section>
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
        summary={summaryPreview(project.description)}
        badge={project.award}
      />
    </li>
  );
}

/**
 * 한 줄 미리보기. 소개가 마크다운일 수 있어 문법 기호를 걷어내고, 그림 문자는 줄 높이를 흔들어 뺀다.
 * 화면에서는 어차피 한 줄로 잘리므로 앞부분만 내려보낸다.
 */
export function summaryPreview(description: string): string {
  return markdownToPlainText(description)
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
