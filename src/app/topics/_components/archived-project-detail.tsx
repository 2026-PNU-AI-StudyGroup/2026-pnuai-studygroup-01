import Link from "next/link";

import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { ProjectMediaCarousel } from "@/app/topics/_components/project-media-carousel";
import { ProjectAwardBadge } from "@/app/topics/_components/project-award-badge";
import {
  buildShowcaseMedia,
  ProjectArtifactSection,
  ProjectRepositoryCallout,
  resolveShowcaseRepository,
} from "@/app/topics/_components/project-showcase-sections";
import { ArchivedProjectVoteAction } from "@/app/topics/_components/project-vote-control";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { ChevronIcon } from "@/shared/ui/workspace-icons";

export function ArchivedProjectDetail({ project, ballot }: { project: ArchivedProject; ballot?: ProgramVoteBallot }) {
  const { media, embeddedIds, galleryIds } = buildShowcaseMedia({
    artifacts: project.artifacts,
    title: project.topicTitle,
    thumbnailPath: project.thumbnailPath,
    posterPath: project.posterPath,
  });
  const voteAction = ballot?.phase === "OPEN" && ballot.candidates.some(({ id }) => id === project.topicId)
    ? <ArchivedProjectVoteAction ballot={ballot} topicId={project.topicId} />
    : undefined;
  // 심사는 저장소의 리드미를 읽고 이뤄진다. 읽고 나서 투표하는 차례가 되도록 저장소를 위에 둔다.
  const repository = resolveShowcaseRepository({ artifacts: project.artifacts, sourceUrl: project.sourceUrl });
  const headerAside = repository || voteAction
    ? <div className="space-y-5">{repository ? <ProjectRepositoryCallout repository={repository} /> : null}{voteAction}</div>
    : undefined;

  return <>
    <UiNav aria-label="이전 위치" className="mb-5">
      <Link href={`/topics?view=past&programId=${encodeURIComponent(project.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
        <ChevronIcon className="size-4 rotate-180" />
        <UiText>{"지난 프로젝트"}</UiText>
      </Link>
    </UiNav>
    <ProjectDetailShell
      heading={<div className="mx-auto w-full max-w-4xl"><p className="text-sm font-semibold text-[var(--muted)]">{project.startYear} · {project.programName} · {project.teamName}{project.divisionName ? ` · ${project.divisionName}` : ""}</p><h1 className="mt-3 text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.035em]"><UiText>{project.topicTitle}</UiText></h1>{project.award || typeof project.archivedVoteCount === "number" ? <div className="mt-4 flex flex-wrap items-center gap-2">{project.award ? <ProjectAwardBadge award={project.award} /> : null}{typeof project.archivedVoteCount === "number" ? <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--muted)]">{project.archivedVoteCount}<UiText>{"표"}</UiText></span> : null}</div> : null}<div className="mt-6 space-y-2.5">{project.memberNames[0] ? <div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--primary-hover)] py-1 text-[0.7rem] font-bold text-[var(--primary)]"><UiText>{"팀장"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{project.memberNames[0]}</span></div> : null}{project.memberNames.length > 1 ? <div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--line)] py-1 text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"팀원"}</UiText></span>{project.memberNames.slice(1).map((name) => <span key={name} className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{name}</span>)}</div> : null}{project.advisorEnabled ? <div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--line)] py-1 text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"지도교수"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{project.professorName} {project.advisorRole}</span></div> : null}</div></div>}
      headerAside={headerAside}
    >
      <div className="mx-auto max-w-4xl space-y-11">
        <ProjectMediaCarousel items={media} />
        <section aria-labelledby="archive-description"><h2 id="archive-description" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"프로젝트 소개"}</UiText></h2><LocalizedMarkdown text={project.showcaseIntro ?? project.topicDescription} className="mt-3 space-y-3 text-[0.9375rem] text-[var(--ink)]" /></section>
        <ProjectArtifactSection artifacts={project.artifacts} sourceUrl={project.sourceUrl} embeddedIds={embeddedIds} galleryIds={galleryIds} repositoryShownAbove={Boolean(repository)} />
      </div>
    </ProjectDetailShell>
  </>;
}
