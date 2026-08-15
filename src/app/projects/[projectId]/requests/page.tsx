import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { TranslatedText } from "@/app/_components/translated-text";
import {
  CancelProjectGuidanceRequestForm,
  ProjectGuidanceRequestForm,
  ProjectGuidanceResponseForm,
} from "@/app/projects/[projectId]/_components/project-guidance-request-forms";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import {
  ProjectGuidanceRequestNotFoundError,
  ProjectGuidanceRequestQueryService,
} from "@/modules/project-guidance-request/application/manage-project-guidance-requests";
import type { ProjectGuidanceRequestItem } from "@/modules/project-guidance-request/application/project-guidance-request-ports";
import { PrismaProjectGuidanceRequestRepository } from "@/modules/project-guidance-request/infrastructure/prisma-project-guidance-request-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiArticle, UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("회의·검토 요청");
}

const kindLabel = {
  MEETING: "회의 요청",
  REVIEW: "검토 요청",
} as const;

function requestStatus(request: ProjectGuidanceRequestItem) {
  if (request.status === "PENDING") return { label: "답변 대기", tone: "warning" as const };
  if (request.status === "CANCELED") return { label: "취소됨", tone: "neutral" as const };
  if (request.kind === "MEETING" && request.scheduledAt) {
    return { label: "일정 확정", tone: "success" as const };
  }
  return {
    label: request.kind === "REVIEW" ? "검토 답변 완료" : "답변 완료",
    tone: "success" as const,
  };
}

export default async function ProjectGuidanceRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: SearchParamValue }>;
}) {
  const { projectId } = await params;
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const { actor, workspace } = await loadTeamWorkspace(projectId);
  if (!workspace.advisorEnabled) notFound();
  let requestPage;
  try {
    requestPage = await new ProjectGuidanceRequestQueryService(
      new PrismaProjectGuidanceRequestRepository(prisma),
    ).list(actor, workspace.id, requestedPage);
  } catch (error) {
    if (error instanceof ProjectGuidanceRequestNotFoundError) notFound();
    throw error;
  }

  const canCreate = workspace.status === "IN_PROGRESS" &&
    workspace.access.isTeamMember;
  const canRespond = workspace.status === "IN_PROGRESS" && workspace.access.canSupervise;

  return (
    <section aria-labelledby="guidance-request-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="회의·검토 요청"
        titleId="guidance-request-title"
        description="지도교수에게 회의나 검토를 요청하고 답변과 확정 일정을 확인합니다."
        bordered={false}
        meta={<StatusBadge tone={requestPage.pendingTotal > 0 ? "warning" : "neutral"}>{requestPage.pendingTotal}<UiText>{"건 답변 대기"}</UiText></StatusBadge>}
      />

      {canCreate ? (
        <section aria-labelledby="new-guidance-request-title" className="grid gap-5 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-5 py-5 shadow-[0_12px_34px_rgba(31,35,48,0.06)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
          <div>
            <h2 id="new-guidance-request-title" className="text-xl font-extrabold tracking-[-0.025em]"><UiText>{"회의나 검토가 필요하신가요?"}</UiText></h2>
            <p className="muted mt-1.5 text-sm leading-6"><UiText>{"같은 유형의 요청은 교수 답변을 받은 뒤 다시 보낼 수 있습니다."}</UiText></p>
          </div>
          <ProjectGuidanceRequestForm
            teamId={workspace.id}
          />
        </section>
      ) : workspace.access.isTeamMember ? (
        <UiAside aria-label="새 요청 제한" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-5 py-4 shadow-[0_12px_34px_rgba(31,35,48,0.04)] sm:px-6">
          <p className="text-sm font-bold"><UiText>{workspace.status === "FORMING"
            ? "팀 확정 후 새 요청을 보낼 수 있습니다."
            : "종료된 프로젝트에서는 요청 이력만 확인할 수 있습니다."}</UiText></p>
        </UiAside>
      ) : null}

      <section aria-labelledby="guidance-request-history-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--primary)]"><UiText>{"요청 이력"}</UiText></p>
            <h2 id="guidance-request-history-title" className="mt-1 text-2xl font-bold tracking-[-0.04em]"><UiText>{"회의와 검토 요청"}</UiText></h2>
          </div>
          <p className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-bold text-[var(--ink)]"><UiText>{"전체"}</UiText>{" "}{requestPage.total}<UiText>{"건"}</UiText></p>
        </div>

        {requestPage.items.length === 0 ? (
          <div className="pt-4">
            <EmptyState
              title="아직 등록된 요청이 없습니다"
              description={workspace.access.canSupervise
                ? "학생이 회의나 검토를 요청하면 이곳에서 확인하고 답변할 수 있습니다."
                : "회의나 검토가 필요할 때 새 요청 보내기 버튼으로 첫 요청을 작성하세요."}
            />
          </div>
        ) : (
          <ol className="mt-4 grid gap-4">
            {requestPage.items.map((request) => (
              <RequestRecord
                key={request.id}
                request={request}
                actorId={actor.id}
                canRespond={canRespond}
                executionEndsAt={workspace.schedule.executionEndsAt}
              />
            ))}
          </ol>
        )}

        {requestPage.totalPages > 1 ? (
          <UiNav aria-label="회의·검토 요청 페이지" className="mt-6 flex items-center justify-between gap-3">
            <span className="muted text-sm">{requestPage.page} / {requestPage.totalPages}<UiText>{" 페이지"}</UiText></span>
            <div className="flex gap-2">
              {requestPage.page > 1 ? <PaginationDirectionLink direction="previous" href={`/projects/${projectId}/requests?page=${requestPage.page - 1}`} /> : <span />}
              {requestPage.page < requestPage.totalPages ? <PaginationDirectionLink direction="next" href={`/projects/${projectId}/requests?page=${requestPage.page + 1}`} /> : null}
            </div>
          </UiNav>
        ) : null}
      </section>
    </section>
  );
}

function RequestRecord({
  request,
  actorId,
  canRespond,
  executionEndsAt,
}: {
  request: ProjectGuidanceRequestItem;
  actorId: string;
  canRespond: boolean;
  executionEndsAt: Date;
}) {
  const status = requestStatus(request);
  const titleId = `guidance-request-record-title-${request.id}`;
  const cardTone = request.status === "PENDING"
    ? "border-[color-mix(in_srgb,var(--warning)_32%,var(--line))]"
    : request.status === "ANSWERED"
      ? "border-[color-mix(in_srgb,var(--success)_25%,var(--line))]"
      : "border-[var(--line)]";
  return (
    <li>
      <UiArticle
        aria-labelledby={titleId}
        data-request-state={request.status.toLowerCase()}
        className={`space-y-5 rounded-[var(--radius-panel)] border bg-white p-5 shadow-[0_12px_34px_rgba(31,35,48,0.06)] sm:p-6 ${cardTone}`}
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info">{kindLabel[request.kind]}</StatusBadge>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            <h3 id={titleId} className="mt-3 text-lg font-extrabold tracking-[-0.02em]"><TranslatedText text={request.title} /></h3>
          </div>
          {request.status === "PENDING" && request.requesterId === actorId ? (
            <CancelProjectGuidanceRequestForm teamId={request.teamId} requestId={request.id} />
          ) : null}
        </header>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <RequestField label="요청자"><span className="font-semibold">{request.requesterName}</span></RequestField>
          <RequestField label="요청 시각"><time dateTime={request.createdAt.toISOString()}><UiDate value={request.createdAt} mode="dateTime" /></time></RequestField>
        </dl>

        <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-4">
          <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"요청 내용"}</UiText></p>
          <TranslatedText text={request.content} className="mt-2 whitespace-pre-wrap text-sm leading-6" />
          {request.referenceUrl ? (
            <a href={request.referenceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)] underline-offset-4 hover:underline">
              <UiText>{"참고 링크 열기"}</UiText>{" "}<span className="sr-only"><UiText>{"새 창"}</UiText></span>
            </a>
          ) : null}
        </div>

        {request.status === "ANSWERED" && request.response && request.respondedAt ? (
          <UiAside aria-label="지도 답변" className="rounded-[var(--radius-control)] border border-[var(--success)] bg-[var(--success-subtle)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold"><UiText>{"지도 답변"}</UiText></h4>
              <p className="text-xs text-[var(--muted)]">{request.responderName}<span aria-hidden="true"> · </span><time dateTime={request.respondedAt.toISOString()}><UiDate value={request.respondedAt} mode="dateTime" /></time></p>
            </div>
            <TranslatedText text={request.response} className="mt-3 whitespace-pre-wrap text-sm leading-6" />
            {request.scheduledAt ? (
              <p className="mt-3 border-t border-[var(--success)] pt-3 text-sm font-semibold"><UiText>{"확정 일시"}</UiText>{" "}<time dateTime={request.scheduledAt.toISOString()}><UiDate value={request.scheduledAt} mode="dateTime" /></time></p>
            ) : null}
          </UiAside>
        ) : null}

        {request.status === "CANCELED" ? (
          <p className="text-sm text-[var(--muted)]"><UiText>{"요청자가 답변 전에 취소한 요청입니다."}</UiText></p>
        ) : null}

        {request.status === "PENDING" && canRespond ? (
          <ProjectGuidanceResponseForm
            teamId={request.teamId}
            requestId={request.id}
            kind={request.kind}
            executionEndsAt={executionEndsAt}
          />
        ) : null}
      </UiArticle>
    </li>
  );
}

function RequestField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="mt-1 leading-6 text-[var(--ink)]">{children}</dd></div>;
}
