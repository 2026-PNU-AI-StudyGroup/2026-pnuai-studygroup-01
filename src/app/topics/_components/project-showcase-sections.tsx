import type { ProjectMediaItem } from "@/app/topics/_components/project-media-carousel";
import { resolveShowcaseRepository } from "@/modules/team/domain/showcase-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { GithubIcon } from "@/shared/ui/github-icon";
import { DocumentIcon, ExternalLinkIcon } from "@/shared/ui/workspace-icons";

// 진행 중 프로젝트와 지난 프로젝트가 같은 결과물을 같은 모양으로 보여주도록 한곳에 둔다.
// 예전에는 화면마다 따로 만들어 두어 진행 중 프로젝트에서는 사진·영상·저장소가 아예 빠져 있었다.

export type ShowcaseArtifact = {
  id: string;
  type: "PRESENTATION_VIDEO" | "SOURCE_CODE" | "POSTER" | "OTHER" | "IMAGE";
  title: string;
  fileId?: string;
  externalUrl?: string;
  position: number;
};

const ARTIFACT_TYPE_LABEL = {
  PRESENTATION_VIDEO: "발표 영상",
  SOURCE_CODE: "소스 코드",
  POSTER: "포스터",
  OTHER: "기타",
  IMAGE: "이미지",
} as const;

export function toYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// 공개 아카이브도 같은 규칙을 써야 해서 고르는 자리를 모듈로 옮겼다. 상세 화면은 여기서 계속 가져간다.
export { resolveShowcaseRepository };

/**
 * 저장소로 보내는 첫 손잡이.
 *
 * 심사는 리드미를 읽고 이뤄지는데 저장소 링크가 사진과 소개 아래에 묻혀 있어 거기까지
 * 닿지 못한다는 이야기를 들었다. 제목 옆에 두어 스크롤 없이 보이게 한다.
 */
export function ProjectRepositoryCallout({ repository }: {
  repository: NonNullable<ReturnType<typeof resolveShowcaseRepository>>;
}) {
  return (
    <div>
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"소스와 문서"}</UiText></p>
      <p className="mt-2 truncate text-sm font-bold text-[var(--ink)]" title={`${repository.owner}/${repository.repo}`}>
        {repository.owner}/{repository.repo}
      </p>
      <a
        href={repository.url}
        target="_blank"
        rel="noreferrer"
        className="button-primary mt-3 w-full gap-2"
      >
        <GithubIcon className="size-4 shrink-0" />
        <UiText>{"README 보러 가기"}</UiText>
        <span className="sr-only"> <UiText>{"새 창"}</UiText></span>
      </a>
    </div>
  );
}

/** 발표 영상 → 대표 이미지 → 갤러리 사진 → 포스터 순서로 싣는다. */
export function buildShowcaseMedia(input: {
  artifacts: ShowcaseArtifact[];
  title: string;
  thumbnailPath?: string | null;
  posterPath?: string | null;
}): { media: ProjectMediaItem[]; embeddedIds: Set<string>; galleryIds: Set<string> } {
  const videos = input.artifacts
    .map((artifact) => ({ artifact, embedUrl: artifact.type === "PRESENTATION_VIDEO" ? toYoutubeEmbedUrl(artifact.externalUrl) : null }))
    .filter((entry): entry is { artifact: ShowcaseArtifact; embedUrl: string } => entry.embedUrl !== null);
  const images = input.artifacts.filter((artifact) => artifact.type === "IMAGE" && (artifact.fileId || artifact.externalUrl));
  return {
    media: [
      ...videos.map(({ artifact, embedUrl }) => ({ kind: "video" as const, embedUrl, title: artifact.title })),
      ...(input.thumbnailPath ? [{ kind: "image" as const, src: input.thumbnailPath, alt: `${input.title} 대표 이미지` }] : []),
      ...images.map((artifact) => ({ kind: "image" as const, src: artifact.fileId ? `/api/files/${artifact.fileId}` : artifact.externalUrl!, alt: artifact.title })),
      ...(input.posterPath ? [{ kind: "image" as const, src: input.posterPath, alt: `${input.title} 프로젝트 포스터` }] : []),
    ],
    embeddedIds: new Set(videos.map(({ artifact }) => artifact.id)),
    galleryIds: new Set(images.map(({ id }) => id)),
  };
}

export function ProjectArtifactSection({ artifacts, sourceUrl, embeddedIds, galleryIds, repositoryShownAbove = false }: {
  artifacts: ShowcaseArtifact[];
  sourceUrl?: string | null;
  embeddedIds: Set<string>;
  galleryIds: Set<string>;
  /** 저장소를 화면 위에서 이미 안내했다면 여기서 또 보여 주지 않는다. */
  repositoryShownAbove?: boolean;
}) {
  const repository = resolveShowcaseRepository({ artifacts, sourceUrl });
  const github = repositoryShownAbove ? null : repository;
  const rest = artifacts.filter((artifact) => !embeddedIds.has(artifact.id) && !galleryIds.has(artifact.id) && artifact.id !== repository?.artifactId);
  // 저장소 카드도 링크 목록도 없을 때만 준비 중으로 본다.
  const plainSourceUrl = !repository && sourceUrl ? sourceUrl : null;
  const hasResults = Boolean(github) || Boolean(plainSourceUrl) || rest.length > 0;
  // 위에서 저장소를 안내했고 그 밖에 내보일 것이 없으면 빈 제목만 남는다. 통째로 접는다.
  if (repositoryShownAbove && !hasResults) return null;

  return (
    <section aria-labelledby="project-artifacts">
      <h2 id="project-artifacts" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"공개 결과물"}</UiText></h2>
      {hasResults ? (
        <div className="mt-3 space-y-3">
          {github ? (
            <a href={github.url} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] p-4 transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]">
              <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--ink)] text-white"><GithubIcon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--ink)]">{github.owner}/{github.repo}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--muted)]"><UiText>{"GitHub 저장소"}</UiText></span>
              </span>
              <ExternalLinkIcon className="size-4 shrink-0 text-[var(--muted)]" />
            </a>
          ) : null}
          {plainSourceUrl ? (
            <a href={plainSourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] p-4 transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--ink)]"><UiText>{"프로젝트 링크"}</UiText></span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--muted)]">{plainSourceUrl}</span>
              </span>
              <ExternalLinkIcon className="size-4 shrink-0 text-[var(--muted)]" />
            </a>
          ) : null}
          {rest.length ? (
            <ul className="flex flex-wrap gap-2">
              {rest.map((artifact) => {
                const chip = <>
                  {artifact.type === "SOURCE_CODE" ? <GithubIcon className="size-4 shrink-0" /> : <DocumentIcon className="size-4 shrink-0 text-[var(--muted)]" />}
                  <span className="truncate text-sm font-semibold text-[var(--ink)]"><UiText>{artifact.title}</UiText></span>
                  <span className="shrink-0 text-[0.6875rem] font-semibold text-[var(--muted)]">{ARTIFACT_TYPE_LABEL[artifact.type]}</span>
                  {artifact.fileId || artifact.externalUrl ? <ExternalLinkIcon className="size-3.5 shrink-0 text-[var(--muted)]" /> : null}
                </>;
                const base = "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--line)] px-3.5 py-2";
                const hover = "transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]";
                return (
                  <li key={artifact.id}>
                    {artifact.fileId
                      ? <a className={`${base} ${hover}`} href={`/api/files/${artifact.fileId}`}>{chip}</a>
                      : artifact.externalUrl
                        ? <a className={`${base} ${hover}`} href={artifact.externalUrl} target="_blank" rel="noreferrer">{chip}<span className="sr-only"> <UiText>{"새 창"}</UiText></span></a>
                        : <span className={`${base} text-[var(--muted)]`}>{chip}</span>}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><UiText>{"공개 결과물 준비 중"}</UiText></p>}
    </section>
  );
}
