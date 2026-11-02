import type { ProjectMediaItem } from "@/app/topics/_components/project-media-carousel";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
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
 * 닿지 못한다는 이야기를 들었다. 프로젝트 머리의 버튼 자리에 두어 스크롤 없이 보이게 한다.
 */
export function ProjectRepositoryCallout({ repository, primary = false }: {
  repository: NonNullable<ReturnType<typeof resolveShowcaseRepository>>;
  /** 지원처럼 더 앞선 할 일이 없을 때만 채운 버튼으로 둔다. */
  primary?: boolean;
}) {
  return (
    <a
      href={repository.url}
      target="_blank"
      rel="noreferrer"
      title={`${repository.owner}/${repository.repo}`}
      className={`${primary ? "button-primary" : "button-secondary"} button-compact gap-1.5`}
    >
      <GithubIcon className="size-4 shrink-0" />
      <UiText>{"README 보러 가기"}</UiText>
      <span className="sr-only"> <UiText>{"새 창"}</UiText></span>
    </a>
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

  const rowClass = "flex min-w-0 items-center gap-3 py-2.5 text-sm [&+li]:border-t [&+li]:border-[var(--line)]";
  return (
    <section aria-labelledby="project-artifacts" className={cardClass}>
      <CardHead id="project-artifacts" title={<UiText>{"공개 결과물"}</UiText>} count={hasResults ? <>{(github ? 1 : 0) + (plainSourceUrl ? 1 : 0) + rest.length}<UiText>{"개"}</UiText></> : undefined} />
      {hasResults ? (
        <ul className="px-5 pb-2">
          {github ? (
            <li className={rowClass}>
              <GithubIcon className="size-4 shrink-0 text-[var(--muted)]" />
              <a href={github.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-[var(--ink)] hover:text-[var(--primary)]">{github.owner}/{github.repo}</a>
              <span className="shrink-0 text-xs text-[var(--muted)]"><UiText>{"GitHub 저장소"}</UiText></span>
            </li>
          ) : null}
          {plainSourceUrl ? (
            <li className={rowClass}>
              <ExternalLinkIcon className="size-4 shrink-0 text-[var(--muted)]" />
              <a href={plainSourceUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-[var(--ink)] hover:text-[var(--primary)]"><UiText>{"프로젝트 링크"}</UiText></a>
              <span className="min-w-0 max-w-[50%] truncate text-xs text-[var(--muted)]">{plainSourceUrl}</span>
            </li>
          ) : null}
          {rest.map((artifact) => {
            const label = <span className="min-w-0 flex-1 truncate font-medium"><UiText>{artifact.title}</UiText></span>;
            return (
              <li key={artifact.id} className={rowClass}>
                {artifact.type === "SOURCE_CODE" ? <GithubIcon className="size-4 shrink-0 text-[var(--muted)]" /> : <DocumentIcon className="size-4 shrink-0 text-[var(--muted)]" />}
                {artifact.fileId
                  ? <a className="flex min-w-0 flex-1 text-[var(--ink)] hover:text-[var(--primary)]" href={`/api/files/${artifact.fileId}`}>{label}</a>
                  : artifact.externalUrl
                    ? <a className="flex min-w-0 flex-1 text-[var(--ink)] hover:text-[var(--primary)]" href={artifact.externalUrl} target="_blank" rel="noreferrer">{label}<span className="sr-only"> <UiText>{"새 창"}</UiText></span></a>
                    : <span className="flex min-w-0 flex-1 text-[var(--muted)]">{label}</span>}
                <span className="shrink-0 text-xs text-[var(--muted)]"><UiText>{ARTIFACT_TYPE_LABEL[artifact.type]}</UiText></span>
              </li>
            );
          })}
        </ul>
      ) : <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"공개 결과물 준비 중"}</UiText></p>}
    </section>
  );
}
