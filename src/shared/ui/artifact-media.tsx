import { UiText } from "@/shared/i18n/i18n-provider";
import { ArtifactPoster } from "@/shared/ui/artifact-poster";
import { DocumentIcon, ExternalLinkIcon } from "@/shared/ui/workspace-icons";

export const ARTIFACT_TYPE_LABELS = {
  PRESENTATION_VIDEO: "발표 영상",
  SOURCE_CODE: "소스 코드",
  POSTER: "포스터",
  OTHER: "기타",
  IMAGE: "이미지",
} as const;

export type ArtifactType = keyof typeof ARTIFACT_TYPE_LABELS;

// YouTube watch/short URL을 embed URL로 변환. 실패 시 null.
export function toYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// 결과물 종류에 따라 임베드 영상·이미지·링크·다운로드 중 알맞은 형태로 노출한다.
export function ArtifactMedia({ type, title, fileId, externalUrl }: {
  type: ArtifactType;
  title: string;
  fileId: string | null | undefined;
  externalUrl: string | null | undefined;
}) {
  const embedUrl = type === "PRESENTATION_VIDEO" ? toYoutubeEmbedUrl(externalUrl) : null;
  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-black">
        <iframe className="size-full" src={embedUrl} title={title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
      </div>
    );
  }
  if ((type === "POSTER" || type === "IMAGE") && (fileId || externalUrl)) {
    return <ArtifactPoster src={externalUrl ?? `/api/files/${fileId}`} title={title} />;
  }
  if (externalUrl) {
    return (
      <a className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-[var(--primary-hover)] hover:underline [overflow-wrap:anywhere]" href={externalUrl} target="_blank" rel="noreferrer">
        <ExternalLinkIcon className="size-4 shrink-0" /><span className="min-w-0 break-all">{externalUrl}</span><span className="sr-only"> <UiText>{"새 창"}</UiText></span>
      </a>
    );
  }
  if (fileId) {
    return (
      <a className="button-secondary gap-2" href={`/api/files/${fileId}`}><DocumentIcon className="size-4" /><UiText>{"파일 받기"}</UiText></a>
    );
  }
  return null;
}
