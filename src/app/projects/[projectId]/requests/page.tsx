import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TranslatedText } from "@/app/_components/translated-text";
import {
  CancelProjectGuidanceRequestForm,
  ProjectGuidanceRequestForm,
  ProjectGuidanceResponseForm,
} from "@/app/projects/[projectId]/_components/project-guidance-request-forms";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { cardClass, CardHead, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
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
import { EmptyState } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("회의·검토 요청");
}

const kindLabel = {
  MEETING: "회의 요청",
  REVIEW: "검토 요청",
} as const;

const meetingTime = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Seoul" });

function requestStatus(request: ProjectGuidanceRequestItem): { label: string; tone: PillTone } {
  if (request.status === "PENDING") return { label: "답변 대기", tone: "warning" };
  if (request.status === "CANCELED") return { label: "취소됨", tone: "plain" };
  if (request.kind === "MEETING" && request.scheduledAt) return { label: "일정 확정", tone: "success" };
  return { label: request.kind === "REVIEW" ? "검토 답변 완료" : "답변 완료", tone: "success" };
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
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId);
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
  const now = new Date();
  // 이 쪽에 보이는 요청 가운데 아직 오지 않은 확정 회의 하나.
  const nextMeeting = requestPage.items
    .flatMap((request) => request.scheduledAt && request.scheduledAt >= now ? [request.scheduledAt] : [])
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const restriction = canCreate || !workspace.access.isTeamMember
    ? null
    : workspace.status === "FORMING"
      ? "팀 확정 후 새 요청을 보낼 수 있습니다."
      : "종료된 프로젝트에서는 요청 이력만 확인할 수 있습니다.";
  const pendingSentence = workspace.access.canSupervise
    ? `답변할 요청이 ${requestPage.pendingTotal}건입니다.`
    : `지도교수 답변을 기다리는 요청이 ${requestPage.pendingTotal}건입니다.`;
  // 학생이 새 요청을 쓸 수 있으면 다시 보내는 규칙을 회색으로 덧붙인다.
  const parts = [
    requestPage.pendingTotal > 0 ? <b key="pending" className="font-semibold"><UiText>{pendingSentence}</UiText></b> : null,
    nextMeeting ? <UiText key="meeting">{`다음 회의는 ${meetingTime.format(nextMeeting)}입니다.`}</UiText> : null,
    restriction ? <span key="restriction" className="text-[var(--muted)]"><UiText>{restriction}</UiText></span> : null,
    canCreate ? <span key="rule" className="text-[var(--muted)]"><UiText>{"같은 유형의 요청은 교수 답변을 받은 뒤 다시 보낼 수 있습니다."}</UiText></span> : null,
  ].filter(Boolean);
  const finding = parts.length ? <p>{parts.flatMap((part, index) => index ? [" ", part] : [part])}</p> : undefined;

  return (
    <section aria-labelledby="guidance-request-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        title="회의·검토 요청"
        titleId="guidance-request-title"
        finding={finding}
        actions={canCreate ? <ProjectGuidanceRequestForm teamId={workspace.id} /> : undefined}
      />

      <section aria-labelledby="guidance-request-history-title" className={`${cardClass} @container`}>
        <CardHead
          id="guidance-request-history-title"
          title={<UiText>{"요청 이력"}</UiText>}
          count={<UiText>{`전체 ${requestPage.total}건`}</UiText>}
          action={<Pill tone={requestPage.pendingTotal > 0 ? "warning" : "plain"}>{`${requestPage.pendingTotal}건 답변 대기`}</Pill>}
        />

        {requestPage.items.length === 0 ? (
          <div className="border-t border-[var(--line)] px-5">
            <EmptyState
              variant="section"
              title="아직 등록된 요청이 없습니다"
              description={workspace.access.canSupervise
                ? "학생이 회의나 검토를 요청하면 이곳에서 확인하고 답변할 수 있습니다."
                : "회의나 검토가 필요할 때 새 요청 보내기 버튼으로 첫 요청을 작성하세요."}
            />
          </div>
        ) : (
          <ol>
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
          <UiNav aria-label="회의·검토 요청 페이지" className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-2.5">
            <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{requestPage.page} / {requestPage.totalPages}<UiText>{" 페이지"}</UiText></span>
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
  return (
    <li className="border-t border-[var(--line)]">
      {/* 왼쪽: 어떤 요청이고 지금 어디에 있는지, 할 일. 오른쪽: 요청 내용과 받은 답변. */}
      <UiArticle
        aria-labelledby={titleId}
        data-request-state={request.status.toLowerCase()}
        className="grid gap-x-8 gap-y-3 px-5 py-4 @min-[56rem]:grid-cols-[17rem_minmax(0,1fr)]"
      >
        <div className="min-w-0">
          <h3 id={titleId} className="text-base font-semibold leading-6 text-[var(--ink)] [overflow-wrap:anywhere]"><TranslatedText text={request.title} /></h3>
          <p className="mt-0.5 text-[0.8125rem] tabular-nums text-[var(--muted)]">
            <span>{request.requesterName}</span>, <time dateTime={request.createdAt.toISOString()}><UiDate value={request.createdAt} mode="dateTime" /></time>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Pill>{kindLabel[request.kind]}</Pill>
            <Pill tone={status.tone}>{status.label}</Pill>
            {request.status === "PENDING" && canRespond ? (
              <span className="ml-1">
                <ProjectGuidanceResponseForm
                  teamId={request.teamId}
                  requestId={request.id}
                  kind={request.kind}
                  executionEndsAt={executionEndsAt}
                />
              </span>
            ) : null}
            {request.status === "PENDING" && request.requesterId === actorId ? (
              <span className="ml-1"><CancelProjectGuidanceRequestForm teamId={request.teamId} requestId={request.id} /></span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 text-[0.8125rem]">
          <TranslatedText text={request.content} className="whitespace-pre-wrap leading-5 text-[var(--ink)]" />
          {request.referenceUrl ? (
            <a href={request.referenceUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex min-h-8 items-center font-medium text-[var(--primary)] underline-offset-[3px] hover:underline">
              <UiText>{"참고 링크 열기"}</UiText>{" "}<span className="sr-only"><UiText>{"새 창"}</UiText></span>
            </a>
          ) : null}

          {request.status === "ANSWERED" && request.response && request.respondedAt ? (
            <UiAside aria-label="지도 답변" className="mt-3 rounded-[var(--radius-control)] bg-[var(--success-subtle)] px-3.5 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h4 className="font-semibold text-[var(--ink)]"><UiText>{"지도 답변"}</UiText></h4>
                <p className="text-xs tabular-nums text-[var(--muted)]">{request.responderName}, <time dateTime={request.respondedAt.toISOString()}><UiDate value={request.respondedAt} mode="dateTime" /></time></p>
              </div>
              <TranslatedText text={request.response} className="mt-1 whitespace-pre-wrap leading-5 text-[var(--ink)]" />
              {request.scheduledAt ? (
                <p className="mt-2 font-medium tabular-nums text-[var(--ink)]"><UiText>{"확정 일시"}</UiText>{" "}<time dateTime={request.scheduledAt.toISOString()}><UiDate value={request.scheduledAt} mode="dateTime" /></time></p>
              ) : null}
            </UiAside>
          ) : null}

          {request.status === "CANCELED" ? (
            <p className="mt-2 text-[var(--muted)]"><UiText>{"요청자가 답변 전에 취소한 요청입니다."}</UiText></p>
          ) : null}
        </div>
      </UiArticle>
    </li>
  );
}
