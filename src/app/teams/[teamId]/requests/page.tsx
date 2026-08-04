import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { TranslatedText } from "@/app/_components/translated-text";
import {
  CancelProjectGuidanceRequestForm,
  ProjectGuidanceRequestForm,
  ProjectGuidanceResponseForm,
} from "@/app/teams/[teamId]/_components/project-guidance-request-forms";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
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
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("미팅·검토 요청");
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
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ page?: SearchParamValue }>;
}) {
  const { teamId } = await params;
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  let requestPage;
  try {
    requestPage = await new ProjectGuidanceRequestQueryService(
      new PrismaProjectGuidanceRequestRepository(prisma),
    ).list(actor, teamId, requestedPage);
  } catch (error) {
    if (error instanceof ProjectGuidanceRequestNotFoundError) notFound();
    throw error;
  }

  const canCreate = workspace.status === "CONFIRMED" &&
    workspace.advisorEnabled &&
    workspace.access.isTeamMember;
  const canRespond = workspace.status === "CONFIRMED" && workspace.access.canSupervise;

  return (
    <section aria-labelledby="guidance-request-title" className="space-y-8">
      <WorkspacePageHeader
        eyebrow="프로젝트 지도"
        title="미팅·검토 요청"
        titleId="guidance-request-title"
        description="지도교수에게 회의나 검토를 요청하고 답변과 확정 일정을 확인합니다."
        meta={<StatusBadge tone={requestPage.pendingTotal > 0 ? "warning" : "neutral"}>{requestPage.pendingTotal}<UiText>{"건 답변 대기"}</UiText></StatusBadge>}
      />

      {canCreate ? (
        <section aria-labelledby="new-guidance-request-title" className="space-y-4">
          <div>
            <h2 id="new-guidance-request-title" className="text-xl font-extrabold"><UiText>{"새 요청 보내기"}</UiText></h2>
            <p className="muted mt-1 text-sm leading-6"><UiText>{"같은 유형의 요청은 교수 답변을 받은 뒤 다시 보낼 수 있습니다."}</UiText></p>
          </div>
          <ProjectGuidanceRequestForm
            teamId={teamId}
            executionEndsAt={workspace.schedule.executionEndsAt}
          />
        </section>
      ) : workspace.access.isTeamMember ? (
        <UiAside aria-label="새 요청 제한" className="border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <p className="text-sm font-bold"><UiText>{workspace.status === "FORMING"
            ? "팀 확정 후 새 요청을 보낼 수 있습니다."
            : workspace.status === "CLOSED"
              ? "종료된 프로젝트에서는 요청 이력만 확인할 수 있습니다."
              : "지도교수가 없는 프로젝트에서는 새 요청을 보낼 수 없습니다."}</UiText></p>
        </UiAside>
      ) : null}

      <section aria-labelledby="guidance-request-history-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line-strong)] pb-4">
          <div>
            <p className="eyebrow"><UiText>{"요청 이력"}</UiText></p>
            <h2 id="guidance-request-history-title" className="mt-1 text-xl font-extrabold"><UiText>{"회의와 검토 요청"}</UiText></h2>
          </div>
          <p className="muted text-sm"><UiText>{"전체"}</UiText>{" "}<strong className="text-[var(--ink)]">{requestPage.total}<UiText>{"건"}</UiText></strong></p>
        </div>

        {requestPage.items.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              title="아직 등록된 요청이 없습니다"
              description={workspace.access.canSupervise
                ? "학생이 회의나 검토를 요청하면 이곳에서 확인하고 답변할 수 있습니다."
                : "회의나 검토가 필요할 때 위 양식에서 첫 요청을 보내세요."}
            />
          </div>
        ) : (
          <ol className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
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
          <UiNav aria-label="미팅·검토 요청 페이지" className="mt-6 flex items-center justify-between gap-3">
            <span className="muted text-sm">{requestPage.page} / {requestPage.totalPages}<UiText>{" 페이지"}</UiText></span>
            <div className="flex gap-2">
              {requestPage.page > 1 ? <Link className="button-secondary" href={`/teams/${teamId}/requests?page=${requestPage.page - 1}`}><UiText>{"이전"}</UiText></Link> : <span />}
              {requestPage.page < requestPage.totalPages ? <Link className="button-secondary" href={`/teams/${teamId}/requests?page=${requestPage.page + 1}`}><UiText>{"다음"}</UiText></Link> : null}
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
  return (
    <li className="py-6">
      <UiArticle aria-label={`${kindLabel[request.kind]} ${request.title}`} className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info">{kindLabel[request.kind]}</StatusBadge>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            <h3 className="mt-3 text-lg font-extrabold tracking-[-0.02em]"><TranslatedText text={request.title} /></h3>
          </div>
          {request.status === "PENDING" && request.requesterId === actorId ? (
            <CancelProjectGuidanceRequestForm teamId={request.teamId} requestId={request.id} />
          ) : null}
        </header>

        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <RequestField label="요청자"><span className="font-semibold">{request.requesterName}</span></RequestField>
          <RequestField label="요청 시각"><time dateTime={request.createdAt.toISOString()}><UiDate value={request.createdAt} mode="dateTime" /></time></RequestField>
          <RequestField label="요청 유형"><UiText>{kindLabel[request.kind]}</UiText></RequestField>
          <RequestField label="희망 일시">
            {request.preferredAt ? <time dateTime={request.preferredAt.toISOString()}><UiDate value={request.preferredAt} mode="dateTime" /></time> : <UiText>{"해당 없음"}</UiText>}
          </RequestField>
        </dl>

        <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-4">
          <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"요청 내용"}</UiText></p>
          <TranslatedText text={request.content} className="mt-2 whitespace-pre-wrap text-sm leading-6" />
          {request.referenceUrl ? (
            <a href={request.referenceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)] underline-offset-4 hover:underline">
              <UiText>{"참고 링크 열기"}</UiText>
            </a>
          ) : null}
        </div>

        {request.status === "ANSWERED" && request.response && request.respondedAt ? (
          <UiAside aria-label="지도 답변" className="rounded-[var(--radius-control)] border border-[var(--success)] bg-[var(--success-subtle)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold"><UiText>{"지도 답변"}</UiText></h4>
              <p className="text-xs text-[var(--muted)]">{request.responderName}<span aria-hidden="true"> · </span><time dateTime={request.respondedAt.toISOString()}><UiDate value={request.respondedAt} mode="dateTime" /></time></p>
            </div>
            <TranslatedText text={request.response} className="mt-3 whitespace-pre-wrap text-sm leading-6" />
            {request.scheduledAt ? (
              <p className="mt-3 border-t border-[var(--success)] pt-3 text-sm font-bold"><UiText>{"확정 일시"}</UiText>{" "}<time dateTime={request.scheduledAt.toISOString()}><UiDate value={request.scheduledAt} mode="dateTime" /></time></p>
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
  return <div><dt className="text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="mt-1 leading-6">{children}</dd></div>;
}
