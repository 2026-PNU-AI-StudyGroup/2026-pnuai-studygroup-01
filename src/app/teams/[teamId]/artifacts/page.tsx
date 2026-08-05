import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { ArtifactRegistrationForm } from "@/app/teams/[teamId]/_components/artifact-registration-form";
import { DownloadIcon, ExternalLinkIcon } from "@/app/teams/[teamId]/_components/workspace-icons";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 결과물");
}
const artifactTypeLabel = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function TeamArtifactsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 공개한 결과물이 없습니다." : !workspace.access.canContribute ? "팀원이 첫 결과물을 공개하면 바로 볼 수 있습니다." : workspace.status === "FORMING" ? "팀이 확정되면 결과물을 공개할 수 있습니다." : "소스 코드와 발표 영상, 포스터를 파일 또는 링크로 공개해 보세요.";

  return (
    <section aria-labelledby="artifacts-title" className="space-y-8">
      <WorkspacePageHeader
        eyebrow="프로젝트 결과"
        title="프로젝트 결과물"
        titleId="artifacts-title"
        description="발표 자료와 소스 코드 등 공개 가능한 결과물을 관리합니다."
        actions={workspace.status === "CONFIRMED" && workspace.access.canContribute ? <ArtifactRegistrationForm teamId={workspace.id} /> : undefined}
      />
      {reportWorkspace.artifacts.length === 0 ? <EmptyState title="아직 공개할 결과물이 없습니다" description={emptyDescription} /> : (
        <ul className="grid gap-x-6 gap-y-0 border-t border-[var(--line)] sm:grid-cols-2 xl:grid-cols-3">
          {reportWorkspace.artifacts.map((artifact) => (
            <li key={artifact.id} className="flex min-h-44 flex-col border-b border-[var(--line)] py-5">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-bold text-[var(--primary)]">{artifactTypeLabel[artifact.type]}</span>
                <time className="muted text-xs" dateTime={artifact.createdAt.toISOString()}><UiDate value={artifact.createdAt} mode="date" /></time>
              </div>
              <h2 className="mt-4 font-bold leading-6 [overflow-wrap:anywhere]"><UiText>{artifact.title}</UiText></h2>
              <div className="mt-auto pt-5">
                {artifact.fileId ? <a className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-hover)] hover:underline" href={`/api/files/${artifact.fileId}`}><DownloadIcon className="size-4" /><UiText>{"파일 받기"}</UiText></a> : <a className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-hover)] hover:underline" href={artifact.externalUrl} target="_blank" rel="noreferrer"><ExternalLinkIcon className="size-4" /><UiText>{"링크 열기"}</UiText><span className="sr-only"> {" "}<UiText>{"새 창"}</UiText></span></a>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
