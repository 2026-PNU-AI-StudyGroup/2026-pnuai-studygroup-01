import Link from "next/link";
import type { Metadata } from "next";

import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { KpiStrip } from "@/modules/project-program/ui/work-screen";

import { ArtifactRegistrationForm } from "@/app/projects/[projectId]/_components/artifact-registration-form";
import { ArtifactManagementForm } from "@/app/projects/[projectId]/_components/artifact-management-form";
import { ShowcaseIntroEditor } from "@/app/projects/[projectId]/_components/showcase-intro-editor";
import { ShowcaseManager } from "@/app/projects/[projectId]/_components/showcase-manager";
import { ShowcaseSaveAllBar } from "@/app/projects/[projectId]/_components/showcase-save-all-bar";
import { ShowcaseVideoCard } from "@/app/projects/[projectId]/_components/showcase-video-card";
import { FormSection, rowActionClass, WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadTeamReportWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { ARTIFACT_TYPE_LABELS, ArtifactMedia } from "@/shared/ui/artifact-media";
import { EmptyState } from "@/shared/ui/page-primitives";

type EditableArtifact = {
  id: string;
  type: "SOURCE_CODE" | "POSTER" | "IMAGE" | "OTHER";
  title: string;
  fileId?: string;
};

function isEditableArtifact(artifact: { type: string }): artifact is EditableArtifact {
  return artifact.type !== "PRESENTATION_VIDEO";
}

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 결과물");
}
export default async function TeamArtifactsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace, reportWorkspace } = await loadTeamReportWorkspace(projectId);
  const now = new Date();
  const isStudentRegistrationPeriod = now >= workspace.schedule.executionStartsAt &&
    now <= workspace.schedule.executionEndsAt;
  const canRegisterArtifact = workspace.status === "IN_PROGRESS" &&
    workspace.access.canContribute &&
    (actor.role === "ADMIN" || isStudentRegistrationPeriod);
  const registrationPeriodState = workspace.status === "IN_PROGRESS" &&
    workspace.access.isTeamMember &&
    actor.role !== "ADMIN"
    ? now < workspace.schedule.executionStartsAt
      ? "BEFORE"
      : now > workspace.schedule.executionEndsAt
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
  const showcaseVideo = reportWorkspace.artifacts.find((artifact) => artifact.type === "PRESENTATION_VIDEO");
  const visibleArtifacts = canRegisterArtifact
    ? reportWorkspace.artifacts.filter((artifact): artifact is typeof artifact & { type: "SOURCE_CODE" | "POSTER" | "OTHER" } => artifact.type !== "IMAGE" && artifact.type !== "PRESENTATION_VIDEO")
    : reportWorkspace.artifacts.filter((artifact) => artifact.type !== "PRESENTATION_VIDEO");

  const intro = (reportWorkspace.showcaseIntro ?? workspace.topicDescription ?? "").trim();
  // 방문자 화면에서 아직 비어 있는 칸. 소개 글, 영상, 대표 이미지는 상세 화면 머리와 첫 줄에 실린다.
  const missing = [
    intro ? null : "소개 글",
    showcaseVideo?.externalUrl ? null : "시연 영상",
    reportWorkspace.thumbnailPath ? null : "대표 이미지",
  ].filter((item): item is string => item !== null);
  const finding = canRegisterArtifact
    ? <UiText>{missing.length ? `방문자 화면에서 아직 비어 있는 칸은 ${missing.join(", ")}입니다.` : "소개 글, 시연 영상, 대표 이미지가 모두 방문자 화면에 실려 있습니다."}</UiText>
    : undefined;
  const documentCount = reportWorkspace.artifacts.filter((artifact) => artifact.type !== "IMAGE" && artifact.type !== "PRESENTATION_VIDEO").length;

  return (
    <section aria-labelledby="artifacts-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        title="프로젝트 결과물"
        titleId="artifacts-title"
        finding={finding}
        actions={canRegisterArtifact
          ? <ShowcaseSaveAllBar teamId={workspace.id} topicId={workspace.topicId} />
          : <Link href={`/topics/${workspace.topicId}?view=public`} className={rowActionClass}><UiText>{"방문자 화면 보기"}</UiText></Link>}
      />

      <KpiStrip items={[
        { label: "소개 글", value: intro.length, unit: "자" },
        { label: "시연 영상", value: showcaseVideo?.externalUrl ? 1 : 0, unit: "개" },
        { label: "사진", value: showcaseImages.length, unit: "장", note: <UiText>{reportWorkspace.thumbnailPath ? "대표 이미지 있음" : "대표 이미지 없음"}</UiText> },
        { label: "자료", value: documentCount, unit: "건", note: <UiText>{"소스 코드, 포스터, 기타"}</UiText> },
      ]} />

      {registrationPeriodState && reportWorkspace.artifacts.length > 0 ? (
        <aside
          aria-labelledby="artifact-registration-restriction-title"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-[0.8125rem]"
        >
          <div>
            <p id="artifact-registration-restriction-title" className="font-semibold text-[var(--ink)]"><UiText>{registrationPeriodState === "BEFORE" ? "결과물 등록 기간 전" : "결과물 등록 기간 종료"}</UiText></p>
            <p className="mt-0.5 text-[var(--muted)]"><UiText>{registrationPeriodState === "BEFORE"
              ? "등록 기간이 시작되면 새 결과물을 공개할 수 있습니다."
              : "등록 기간이 종료되어 기존 결과물만 확인할 수 있습니다."}</UiText></p>
          </div>
          <p className="tabular-nums text-[var(--ink)]">
            <UiText>{registrationPeriodState === "BEFORE" ? "등록 시작" : "등록 종료"}</UiText>{" "}
            <time dateTime={(registrationPeriodState === "BEFORE" ? workspace.schedule.executionStartsAt : workspace.schedule.executionEndsAt).toISOString()}>
              <UiDate value={registrationPeriodState === "BEFORE" ? workspace.schedule.executionStartsAt : workspace.schedule.executionEndsAt} mode="dateTime" />
            </time>
          </p>
        </aside>
      ) : null}

      {/* 프로젝트 상세에 실리는 순서대로 둔다. 소개 글, 영상, 이미지, 나머지 자료. 묶음마다 왼쪽에 이름과 설명. */}
      <div className="@container grid gap-6">
        <ShowcaseIntroEditor
          teamId={workspace.id}
          intro={reportWorkspace.showcaseIntro ?? workspace.topicDescription}
          canManage={canRegisterArtifact}
        />
        <ShowcaseVideoCard teamId={workspace.id} video={showcaseVideo} canManage={canRegisterArtifact} />
        {canRegisterArtifact ? <ShowcaseManager key={showcaseImages.map((image) => image.id).join(":")} teamId={workspace.id} thumbnailPath={reportWorkspace.thumbnailPath} images={showcaseImages} /> : null}
        {canRegisterArtifact ? <ArtifactRegistrationForm teamId={workspace.id} /> : null}

        <FormSection
          id="artifact-list-title"
          title={<UiText>{"등록한 자료"}</UiText>}
          description={<>{visibleArtifacts.length}<UiText>{"건"}</UiText></>}
          bodyClassName=""
        >
          {visibleArtifacts.length === 0 ? (
            <div className="px-5"><EmptyState variant="section" title="아직 공개할 결과물이 없습니다" description={emptyDescription} /></div>
          ) : (
            <ul>
              {visibleArtifacts.map((artifact) => {
                const titleId = `artifact-title-${artifact.id}`;
                return (
                  <li key={artifact.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-5 py-3 [&+li]:border-t [&+li]:border-[var(--line)]" data-artifact-type={artifact.type.toLowerCase()}>
                    <div className="min-w-0">
                      <span className="block text-xs text-[var(--muted)]"><UiText>{ARTIFACT_TYPE_LABELS[artifact.type]}</UiText></span>
                      <h3 id={titleId} className="text-sm font-medium leading-5 text-[var(--ink)] [overflow-wrap:anywhere]"><UiText>{artifact.title}</UiText></h3>
                      {/* 포스터와 사진은 작은 미리보기로, 링크는 주소로, 파일은 받기 단추로. */}
                      <div className="mt-1.5 text-[0.8125rem] [&_.button-secondary]:min-h-8 [&_.button-secondary]:px-3 [&_.button-secondary]:text-[0.8125rem] [&_.button-secondary]:font-medium [&_img]:max-w-32">
                        <ArtifactMedia type={artifact.type} title={artifact.title} fileId={artifact.fileId} externalUrl={artifact.externalUrl} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <time className="text-xs tabular-nums text-[var(--muted)]" dateTime={artifact.createdAt.toISOString()}><UiDate value={artifact.createdAt} mode="date" /></time>
                      {canRegisterArtifact && isEditableArtifact(artifact) ? <ArtifactManagementForm teamId={workspace.id} artifact={artifact} /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </FormSection>
      </div>
    </section>
  );
}
