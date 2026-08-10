import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import Link from "next/link";

import { ArtifactRegistrationForm } from "@/app/teams/[teamId]/_components/artifact-registration-form";
import { ArtifactManagementForm } from "@/app/teams/[teamId]/_components/artifact-management-form";
import { DownloadIcon, ExternalLinkIcon } from "@/app/teams/[teamId]/_components/workspace-icons";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 결과물");
}
const artifactTypeLabel = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;
type ArtifactType = keyof typeof artifactTypeLabel;

const artifactTypePresentation = {
  PRESENTATION_VIDEO: {
    tone: "neutral",
    iconClassName: "bg-[var(--warning-subtle)] text-[var(--warning-ink)]",
  },
  SOURCE_CODE: {
    tone: "neutral",
    iconClassName: "bg-[var(--primary-subtle)] text-[var(--primary)]",
  },
  POSTER: {
    tone: "neutral",
    iconClassName: "bg-[var(--success-subtle)] text-[var(--success)]",
  },
  OTHER: {
    tone: "neutral",
    iconClassName: "bg-[var(--surface-subtle)] text-[var(--muted)]",
  },
} as const;

function ArtifactTypeIcon({ type }: { type: ArtifactType }) {
  const icon = type === "PRESENTATION_VIDEO"
    ? <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></>
    : type === "SOURCE_CODE"
      ? <><path d="m9 7-5 5 5 5M15 7l5 5-5 5M14 4l-4 16" /></>
      : type === "POSTER"
        ? <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>
        : <><path d="M4 7h6l2 2h8v10H4z" /></>;
  return (
    <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-xl ${artifactTypePresentation[type].iconClassName}`}>
      <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round]">{icon}</svg>
    </span>
  );
}

export default async function TeamArtifactsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const now = new Date();
  const isStudentRegistrationPeriod = now >= workspace.schedule.submissionStartsAt &&
    now <= workspace.schedule.submissionEndsAt;
  const canRegisterArtifact = workspace.status === "CONFIRMED" &&
    workspace.access.canContribute &&
    (actor.role === "ADMIN" || isStudentRegistrationPeriod);
  const canEditShowcase = actor.role === "ADMIN" || workspace.access.isPrimaryAdvisor || workspace.access.isTeamMember;
  const registrationPeriodState = workspace.status === "CONFIRMED" &&
    workspace.access.isTeamMember &&
    actor.role !== "ADMIN"
    ? now < workspace.schedule.submissionStartsAt
      ? "BEFORE"
      : now > workspace.schedule.submissionEndsAt
        ? "AFTER"
        : null
    : null;
  const emptyDescription = workspace.status === "CLOSED"
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

  return (
    <section aria-labelledby="artifacts-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="프로젝트 결과물"
        titleId="artifacts-title"
        description="발표 자료와 소스 코드 등 공개 가능한 결과물을 관리합니다."
        bordered={false}
        actions={<>{canEditShowcase ? <Link href={`/showcase/${workspace.id}/edit`} className="button-secondary"><UiText>{"쇼케이스 관리"}</UiText></Link> : null}{canRegisterArtifact ? <ArtifactRegistrationForm teamId={workspace.id} /> : null}</>}
      />
      {registrationPeriodState && reportWorkspace.artifacts.length > 0 ? (
        <aside
          aria-labelledby="artifact-registration-restriction-title"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-5 py-4 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:px-6"
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
      {reportWorkspace.artifacts.length === 0 ? <EmptyState title="아직 공개할 결과물이 없습니다" description={emptyDescription} /> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reportWorkspace.artifacts.map((artifact) => {
            const titleId = `artifact-title-${artifact.id}`;
            const presentation = artifactTypePresentation[artifact.type];
            return (
              <li key={artifact.id} className="min-w-0">
                <article
                  aria-labelledby={titleId}
                  data-artifact-type={artifact.type.toLowerCase()}
                  className="flex h-full min-h-56 flex-col rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 shadow-[0_12px_34px_rgba(31,35,48,0.06)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <ArtifactTypeIcon type={artifact.type} />
                    <StatusBadge tone={presentation.tone}><UiText>{artifactTypeLabel[artifact.type]}</UiText></StatusBadge>
                  </div>
                  <h2 id={titleId} className="mt-5 text-lg font-black leading-7 tracking-[-0.025em] [overflow-wrap:anywhere]"><UiText>{artifact.title}</UiText></h2>
                  <time className="muted mt-2 text-sm font-medium" dateTime={artifact.createdAt.toISOString()}><UiDate value={artifact.createdAt} mode="date" /></time>
                  <div className="mt-auto pt-6">
                    {artifact.fileId ? (
                      <a className="button-secondary w-full gap-2" href={`/api/files/${artifact.fileId}`}><DownloadIcon className="size-4" /><UiText>{"파일 받기"}</UiText></a>
                    ) : (
                      <a className="button-secondary w-full gap-2" href={artifact.externalUrl} target="_blank" rel="noreferrer"><ExternalLinkIcon className="size-4" /><UiText>{"링크 열기"}</UiText><span className="sr-only"> {" "}<UiText>{"새 창"}</UiText></span></a>
                    )}
                    {canRegisterArtifact ? <ArtifactManagementForm teamId={workspace.id} artifact={artifact} /> : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
