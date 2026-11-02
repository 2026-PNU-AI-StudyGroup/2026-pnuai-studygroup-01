import type { ReactNode } from "react";

import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { ProjectMediaCarousel } from "@/app/topics/_components/project-media-carousel";
import { ProjectAwardBadge } from "@/modules/project-program/ui/project-award-badge";
import {
  buildShowcaseMedia,
  ProjectArtifactSection,
  ProjectRepositoryCallout,
  resolveShowcaseRepository,
} from "@/app/topics/_components/project-showcase-sections";
import { ArchivedProjectVoteAction } from "@/app/topics/_components/project-vote-control";
import { cardClass, CardHead, KpiStrip, ObjectHeader, Thumb } from "@/modules/project-program/ui/work-screen";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { ProgramIcon } from "@/shared/ui/program-icon";

export function ArchivedProjectDetail({ project, ballot, workspaceLink }: { project: ArchivedProject; ballot?: ProgramVoteBallot; workspaceLink?: ReactNode }) {
  const { media, embeddedIds, galleryIds } = buildShowcaseMedia({
    artifacts: project.artifacts,
    title: project.topicTitle,
    thumbnailPath: project.thumbnailPath,
    posterPath: project.posterPath,
  });
  const voteAction = ballot?.phase === "OPEN" && ballot.candidates.some(({ id }) => id === project.topicId)
    ? <ArchivedProjectVoteAction ballot={ballot} topicId={project.topicId} />
    : undefined;
  // 심사는 저장소의 리드미를 읽고 이뤄진다. 읽고 나서 투표하는 차례가 되도록 저장소를 머리에 둔다.
  const repository = resolveShowcaseRepository({ artifacts: project.artifacts, sourceUrl: project.sourceUrl });
  const people: Array<[string, string[]]> = [
    ["팀장", project.memberNames.slice(0, 1)],
    ["팀원", project.memberNames.slice(1)],
    ...(project.advisorEnabled ? [[project.advisorRole, [project.professorName]] as [string, string[]]] : []),
  ];

  return (
    <ProjectDetailShell
      header={(
        <ObjectHeader
          id="project-title"
          media={<Thumb src={project.thumbnailPath} fallback={<ProgramIcon icon={project.programIcon} />} className="h-[3.875rem] w-[3.125rem]" />}
          title={<UiText>{project.topicTitle}</UiText>}
          titleAside={project.award || project.popularAward ? (
            <>
              {project.award ? <ProjectAwardBadge award={project.award} /> : null}
              {project.popularAward ? <ProjectAwardBadge award="인기상" /> : null}
            </>
          ) : undefined}
          meta={<>{project.startYear} <UiText>{project.programName}</UiText>, <UiText>{`${project.teamNumber === null ? "" : `${project.teamNumber}. `}${project.teamName} 팀`}</UiText>{project.divisionName ? <>, <UiText>{project.divisionName}</UiText></> : null}</>}
          finding={project.award ? <UiText>{`${project.programName} ${project.award} 수상작입니다.`}</UiText> : undefined}
          actions={workspaceLink || repository ? <>{workspaceLink}{repository ? <ProjectRepositoryCallout repository={repository} primary /> : null}</> : undefined}
        />
      )}
      kpis={(
        <KpiStrip items={[
          { label: "팀원", value: project.memberNames.length, unit: "명" },
          { label: "공개 결과물", value: project.artifacts.length, unit: "개" },
          // 정확한 득표수는 관리자에게만 온다. 다른 사람에게는 모르는 값이라 줄표로 둔다.
          { label: "득표", value: project.archivedVoteCount ?? null, unit: "표" },
        ]} />
      )}
      side={(
        <>
          {voteAction ? (
            <section aria-labelledby="project-vote-title" className={`${cardClass} pb-4`}>
              <CardHead id="project-vote-title" title={<UiText>{"투표"}</UiText>} />
              <div className="px-5">{voteAction}</div>
            </section>
          ) : null}
          <section aria-labelledby="project-people-title" className={cardClass}>
            <CardHead id="project-people-title" title={<UiText>{"팀"}</UiText>} count={<UiText>{`${project.memberNames.length}명`}</UiText>} />
            <dl className="px-5 pb-3 text-[0.8125rem]">
              {people.map(([label, names]) => (
                <div key={label} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2 [&+div]:border-t [&+div]:border-[var(--line)]">
                  <dt className="text-[var(--muted)]"><UiText>{label}</UiText></dt>
                  <dd className="min-w-0 text-[var(--ink)]">{names.length ? names.join(", ") : <span className="text-[var(--muted)]">-</span>}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    >
      <section aria-labelledby="archive-description" className={`${cardClass} pb-5`}>
        <CardHead id="archive-description" title={<UiText>{"프로젝트 소개"}</UiText>} />
        {media.length ? <div className="px-5 pb-4"><ProjectMediaCarousel items={media} /></div> : null}
        <LocalizedMarkdown text={project.showcaseIntro ?? project.topicDescription} className="max-w-3xl space-y-3 px-5 text-[0.9375rem] leading-7 text-[var(--ink)]" />
      </section>
      <ProjectArtifactSection artifacts={project.artifacts} sourceUrl={project.sourceUrl} embeddedIds={embeddedIds} galleryIds={galleryIds} repositoryShownAbove={Boolean(repository)} />
    </ProjectDetailShell>
  );
}
