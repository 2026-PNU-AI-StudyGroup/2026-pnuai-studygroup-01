import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { ArtifactRegistrationForm } from "@/app/projects/[projectId]/_components/artifact-registration-form";
import { ArtifactManagementForm } from "@/app/projects/[projectId]/_components/artifact-management-form";
import { ShowcaseManager } from "@/app/projects/[projectId]/_components/showcase-manager";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadTeamReportWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { ARTIFACT_TYPE_LABELS, ArtifactMedia } from "@/shared/ui/artifact-media";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 결과물");
}
export default async function TeamArtifactsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace, reportWorkspace } = await loadTeamReportWorkspace(projectId);
  const now = new Date();
  const isStudentRegistrationPeriod = now >= workspace.schedule.submissionStartsAt &&
    now <= workspace.schedule.submissionEndsAt;
  const canRegisterArtifact = workspace.status === "IN_PROGRESS" &&
    workspace.access.canContribute &&
    (actor.role === "ADMIN" || isStudentRegistrationPeriod);
  const registrationPeriodState = workspace.status === "IN_PROGRESS" &&
    workspace.access.isTeamMember &&
    actor.role !== "ADMIN"
    ? now < workspace.schedule.submissionStartsAt
      ? "BEFORE"
      : now > workspace.schedule.submissionEndsAt
        ? "AFTER"
        : null
    : null;
  const emptyDescription = workspace.status === "COMPLETED"
    ? "프로젝트 종료 전에 공개한 결과물이 없습니다."
    : !workspace.access.canContribute
      ? "팀원이 결과물을 등록하면 확인할 수 있습니다."
      : workspace.status === "FORMING"
        ? "팀이 확정되면 결과물을 공개할 수 있습니다."
        : registrationPeriodState === "BEFORE"
          ? "결과물 등록 기간이 시작되면 파일 또는 링크를 공개할 수 있습니다."
          : registrationPeriodState === "AFTER"
            ? "결과물 등록 기간이 종료되어 새 결과물을 등록할 수 없습니다."
            : "공개할 소스 코드, 발표 영상, 포스터를 파일 또는 링크로 등록하세요.";
  const showcaseImages = reportWorkspace.artifacts
    .filter((artifact) => artifact.type === "IMAGE" && (artifact.fileId || artifact.externalUrl))
    .map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      src: artifact.externalUrl ?? `/api/files/${artifact.fileId}`,
    }));
  const visibleArtifacts = canRegisterArtifact
    ? reportWorkspace.artifacts.filter((artifact) => artifact.type !== "IMAGE")
    : reportWorkspace.artifacts;

  return (
    <section aria-labelledby="artifacts-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="프로젝트 결과물"
        titleId="artifacts-title"
        description="발표 자료와 소스 코드 등 공개 가능한 결과물을 관리합니다."
        bordered={false}
        actions={canRegisterArtifact ? <ArtifactRegistrationForm teamId={workspace.id} /> : undefined}
      />
      {canRegisterArtifact ? <ShowcaseManager key={showcaseImages.map((image) => image.id).join(":")} teamId={workspace.id} thumbnailPath={reportWorkspace.thumbnailPath} images={showcaseImages} /> : null}
      {registrationPeriodState && reportWorkspace.artifacts.length > 0 ? (
        <aside
          aria-labelledby="artifact-registration-restriction-title"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 py-4 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:px-6"
        >
          <div>
            <p id="artifact-registration-restriction-title" className="text-sm font-extrabold text-[var(--ink)]"><UiText>{registrationPeriodState === "BEFORE" ? "결과물 등록 기간 전" : "결과물 등록 기간 종료"}</UiText></p>
            <p className="muted mt-1 text-sm leading-6"><UiText>{registrationPeriodState === "BEFORE"
              ? "등록 기간이 시작되면 새 결과물을 공개할 수 있습니다."
              : "등록 기간이 종료되어 기존 결과물만 확인할 수 있습니다."}</UiText></p>
          </div>
          <p className="text-sm font-bold text-[var(--ink)]">
            <UiText>{registrationPeriodState === "BEFORE" ? "등록 시작" : "등록 종료"}</UiText>{" "}
            <time dateTime={(registrationPeriodState === "BEFORE" ? workspace.schedule.submissionStartsAt : workspace.schedule.submissionEndsAt).toISOString()}>
              <UiDate value={registrationPeriodState === "BEFORE" ? workspace.schedule.submissionStartsAt : workspace.schedule.submissionEndsAt} mode="dateTime" />
            </time>
          </p>
        </aside>
      ) : null}
      {visibleArtifacts.length === 0 ? <EmptyState title="아직 공개할 결과물이 없습니다" description={emptyDescription} /> : (
        <ul className="max-w-3xl space-y-9">
          {visibleArtifacts.map((artifact) => {
            const titleId = `artifact-title-${artifact.id}`;
            return (
              <li key={artifact.id} className="min-w-0" data-artifact-type={artifact.type.toLowerCase()}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]"><UiText>{ARTIFACT_TYPE_LABELS[artifact.type]}</UiText></span>
                    <h2 id={titleId} className="text-base font-bold leading-6 tracking-[-0.02em] [overflow-wrap:anywhere]"><UiText>{artifact.title}</UiText></h2>
                  </div>
                  <time className="muted shrink-0 text-sm font-medium" dateTime={artifact.createdAt.toISOString()}><UiDate value={artifact.createdAt} mode="date" /></time>
                </div>
                <div className="mt-3">
                  <ArtifactMedia type={artifact.type} title={artifact.title} fileId={artifact.fileId} externalUrl={artifact.externalUrl} />
                  {canRegisterArtifact ? <ArtifactManagementForm teamId={workspace.id} artifact={artifact} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
