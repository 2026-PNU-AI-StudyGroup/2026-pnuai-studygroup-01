import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { confirmTeamAction } from "@/app/teams/[teamId]/actions";
import {
  ArtifactExternalForm,
  ArtifactFileForm,
  ReportDecisionForm,
  ReportSubmissionForm,
} from "@/app/teams/[teamId]/report-forms";
import { CloseTeamForm, DiscussionPostForm, MilestoneForm, MilestoneStatusForm, ProgressUpdateForm } from "@/app/teams/[teamId]/workspace-forms";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  ReportOperationNotAllowedError,
  ReportService,
} from "@/modules/report/application/manage-reports";
import type { ReportWorkspace } from "@/modules/report/application/report-ports";
import { PrismaReportRepository } from "@/modules/report/infrastructure/prisma-report-repository";
import { TeamNotFoundError, TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "프로젝트 공간" };

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const milestoneStatus = { TODO: ["할 일", "neutral"], IN_PROGRESS: ["진행 중", "warning"], DONE: ["완료", "success"] } as const;
const reportTypeLabel = { START: "착수 보고서", MIDTERM: "중간 보고서", FINAL: "결과 보고서" } as const;
const artifactTypeLabel = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function TeamWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ discussionPage?: SearchParamValue; progressPage?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { teamId } = await params;
  const workspaceParams = await searchParams;
  const requestedDiscussionPage = Number(firstSearchParam(workspaceParams.discussionPage) ?? "1");
  const requestedProgressPage = Number(firstSearchParam(workspaceParams.progressPage) ?? "1");
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const service = new TeamWorkspaceService(repository, repository, repository, repository);
  let workspace: TeamWorkspace;
  try { workspace = await service.get(actor, teamId, requestedDiscussionPage, requestedProgressPage); } catch (error) { if (error instanceof TeamNotFoundError) notFound(); throw error; }
  let reportWorkspace: ReportWorkspace;
  try {
    reportWorkspace = await new ReportService(
      new PrismaReportRepository(prisma),
    ).get(actor, teamId);
  } catch (error) {
    if (error instanceof ReportOperationNotAllowedError) notFound();
    throw error;
  }
  const progress = workspace.milestoneCount === 0 ? 0 : Math.round((workspace.completedMilestoneCount / workspace.milestoneCount) * 100);
  const milestoneEmptyDescription = workspace.status === "CLOSED"
    ? "프로젝트 종료 전에 등록된 마일스톤이 없습니다."
    : actor.role === "PROFESSOR"
      ? "팀원이 마일스톤을 등록하면 이곳에서 진행 상태를 확인할 수 있습니다."
      : "첫 목표와 완료 예정일을 등록해 프로젝트의 리듬을 만드세요.";
  const progressEmptyDescription = workspace.status === "CLOSED"
    ? "프로젝트 종료 전에 등록된 진행 기록이 없습니다."
    : actor.role === "PROFESSOR"
      ? "팀원이 진행 기록을 남기면 이곳에서 확인할 수 있습니다."
      : "아직 진행 기록이 없습니다. 첫 수행 내용을 남겨 주세요.";
  const discussionEmptyDescription = workspace.status === "CLOSED"
    ? "프로젝트 종료 전에 등록된 토론이 없습니다."
    : "첫 질문이나 의견을 남겨 프로젝트 논의를 시작하세요.";
  const artifactEmptyDescription = workspace.status === "CLOSED"
    ? "프로젝트 종료 전에 등록된 결과물이 없습니다."
    : actor.role === "PROFESSOR"
      ? "팀원이 결과물을 등록하면 이곳에서 확인할 수 있습니다."
      : workspace.status === "FORMING"
        ? "팀 확정 후 결과물을 등록할 수 있습니다."
        : "소스 코드, 발표 영상, 포스터를 파일 또는 HTTPS 링크로 등록하세요.";
  const workspaceHref = (target: { discussionPage?: number; progressPage?: number; anchor: string }) => {
    const query = new URLSearchParams();
    const discussionPage = target.discussionPage ?? workspace.discussionPage;
    const progressPage = target.progressPage ?? workspace.progressPage;
    if (discussionPage > 1) query.set("discussionPage", String(discussionPage));
    if (progressPage > 1) query.set("progressPage", String(progressPage));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return `/teams/${workspace.id}${suffix}#${target.anchor}`;
  };

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="content-shell space-y-12">
        <PageHeader eyebrow="프로젝트 공간" title={workspace.name} description={`${workspace.topicTitle} · 지도교수 ${workspace.professorName}`} actions={<div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center"><StatusBadge>{workspace.status === "FORMING" ? "구성 중" : workspace.status === "CONFIRMED" ? "확정 팀" : "종료 팀"}</StatusBadge>{workspace.status === "FORMING" && actor.role !== "STUDENT" ? <form action={confirmTeamAction}><input type="hidden" name="teamId" value={workspace.id} /><button className="button-primary">팀 확정</button></form> : null}{workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <CloseTeamForm teamId={workspace.id} /> : null}<div className="w-full sm:w-48"><ProgressBar value={progress} /></div></div>} />
        <section aria-labelledby="members-title" className="border-y border-[var(--line)] py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3"><h2 id="members-title" className="text-sm font-bold">팀원 {workspace.members.length}명</h2>{workspace.members.map((member) => <span key={member.id} className="text-sm"><strong>{member.name}</strong><span className="muted ml-2 hidden sm:inline">{member.email}</span></span>)}</div>
        </section>
        <section aria-labelledby="schedule-title">
          <div className="mb-4"><p className="eyebrow">일정</p><h2 id="schedule-title" className="mt-1 text-xl font-bold">프로젝트 일정</h2></div>
          <dl className="grid gap-4 border-y border-[var(--line)] py-5 text-sm md:grid-cols-3"><div><dt className="muted text-xs">모집 기간</dt><dd className="mt-1 font-medium">{koreanDate.format(workspace.schedule.recruitmentStartsAt)} – {koreanDate.format(workspace.schedule.recruitmentEndsAt)}</dd></div><div><dt className="muted text-xs">수행 기간</dt><dd className="mt-1 font-medium">{koreanDate.format(workspace.schedule.executionStartsAt)} – {koreanDate.format(workspace.schedule.executionEndsAt)}</dd></div><div><dt className="muted text-xs">제출 기간</dt><dd className="mt-1 font-medium">{koreanDate.format(workspace.schedule.submissionStartsAt)} – {koreanDate.format(workspace.schedule.submissionEndsAt)}</dd></div></dl>
        </section>
        <div className="grid gap-14 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] xl:items-start">
          <section aria-labelledby="milestones-title">
            <div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">계획</p><h2 id="milestones-title" className="mt-1 text-xl font-bold">마일스톤</h2></div><span className="muted text-sm">완료 {workspace.completedMilestoneCount} / {workspace.milestoneCount}</span></div>
            {workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneForm teamId={workspace.id} /> : null}
            {workspace.milestones.length === 0 ? <div className="mt-5"><EmptyState title="마일스톤이 없습니다" description={milestoneEmptyDescription} /></div> : <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">{workspace.milestones.map((milestone) => <li key={milestone.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><StatusBadge tone={milestoneStatus[milestone.status][1]}>{milestoneStatus[milestone.status][0]}</StatusBadge><div><p className="font-semibold">{milestone.title}</p><p className="muted mt-1 text-xs">{koreanDate.format(milestone.dueAt)}까지</p></div></div>{workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneStatusForm teamId={workspace.id} milestoneId={milestone.id} status={milestone.status} /> : null}</li>)}</ul>}
          </section>
          <section aria-labelledby="updates-title">
            <div className="mb-5"><p className="eyebrow">수행 과정</p><h2 id="updates-title" className="scroll-mt-24 mt-1 text-xl font-bold">진행 기록</h2></div>
            {workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <ProgressUpdateForm teamId={workspace.id} /> : null}
            {workspace.progressUpdates.length === 0 ? <p className="muted mt-5 border-t border-[var(--line)] py-7 text-sm">{progressEmptyDescription}</p> : <ol className="mt-6 border-l border-[var(--line)] pl-5">{workspace.progressUpdates.map((update) => <li key={update.id} className="relative pb-8 before:absolute before:-left-[1.45rem] before:top-1 before:size-2 before:rounded-full before:bg-[var(--accent)]"><div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">{update.authorName}</strong><time dateTime={update.createdAt.toISOString()}>{koreanDate.format(update.createdAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{update.content}</p>{update.risk ? <p className="mt-3 border-l-2 border-[var(--warning)] pl-3 text-sm text-[var(--warning-ink)]">위험 · {update.risk}</p> : null}{update.nextAction ? <p className="mt-2 text-sm font-medium text-[var(--accent-hover)]">다음 행동 · {update.nextAction}</p> : null}</li>)}</ol>}
            {workspace.progressTotalPages > 1 ? <nav aria-label="진행 기록 이력 페이지" className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="muted text-sm">{workspace.progressPage} / {workspace.progressTotalPages} 페이지 · 총 {workspace.progressTotal}개</span><div className="flex gap-2">{workspace.progressPage > 1 ? <Link className="button-quiet" href={workspaceHref({ progressPage: workspace.progressPage - 1, anchor: "updates-title" })}>최근 기록</Link> : null}{workspace.progressPage < workspace.progressTotalPages ? <Link className="button-quiet" href={workspaceHref({ progressPage: workspace.progressPage + 1, anchor: "updates-title" })}>이전 기록</Link> : null}</div></nav> : null}
          </section>
        </div>
        <section aria-labelledby="discussion-title" className="space-y-5">
          <div><p className="eyebrow">소통</p><h2 id="discussion-title" className="scroll-mt-24 mt-1 text-2xl font-bold">팀 토론</h2><p className="muted mt-2 text-sm">팀원과 지도교수가 의견을 공유합니다. 필요한 글은 한국어 또는 영어로 바로 번역할 수 있습니다.</p></div>
          {workspace.status !== "CLOSED" ? <DiscussionPostForm teamId={workspace.id} /> : null}
          {workspace.discussionPosts.length === 0 ? <EmptyState title="아직 토론이 없습니다" description={discussionEmptyDescription} /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{workspace.discussionPosts.map((post) => <li key={post.id} className="py-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{post.authorName}</strong><time className="muted text-xs" dateTime={post.createdAt.toISOString()}>{koreanDate.format(post.createdAt)}</time></div><TranslatedText text={post.content} className="text-sm leading-7" /></li>)}</ol>}
          {workspace.discussionTotalPages > 1 ? <nav aria-label="팀 토론 이력 페이지" className="flex flex-wrap items-center justify-between gap-3"><span className="muted text-sm">{workspace.discussionPage} / {workspace.discussionTotalPages} 페이지 · 총 {workspace.discussionTotal}개</span><div className="flex gap-2">{workspace.discussionPage > 1 ? <Link className="button-quiet" href={workspaceHref({ discussionPage: workspace.discussionPage - 1, anchor: "discussion-title" })}>최근 기록</Link> : null}{workspace.discussionPage < workspace.discussionTotalPages ? <Link className="button-quiet" href={workspaceHref({ discussionPage: workspace.discussionPage + 1, anchor: "discussion-title" })}>이전 기록</Link> : null}</div></nav> : null}
        </section>
        <section aria-labelledby="reports-title" className="space-y-6">
          <div><p className="eyebrow">보고서</p><h2 id="reports-title" className="mt-1 text-2xl font-bold">보고서 제출 및 웹 승인</h2><p className="muted mt-2 text-sm">기존 파일을 덮어쓰지 않고 제출 이력과 교수 검토 결정을 버전별로 보관합니다.</p></div>
          {workspace.status === "CONFIRMED" && actor.role !== "PROFESSOR" ? <ReportSubmissionForm teamId={workspace.id} /> : null}
          {workspace.status === "FORMING" ? <EmptyState title="팀 확정 후 제출할 수 있습니다" description="지도교수가 팀을 확정하면 제출 기간 내 보고서 버전을 등록할 수 있습니다." /> : workspace.status === "CLOSED" ? <EmptyState title="종료된 프로젝트입니다" description="새 보고서를 제출할 수 없으며 기존 제출·승인 이력만 확인할 수 있습니다." /> : null}
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(["START", "MIDTERM", "FINAL"] as const).map((type) => {
              const report = reportWorkspace.reports.find((item) => item.type === type);
              return <article key={type} className="py-6"><div className="flex items-center justify-between"><h3 className="font-bold">{reportTypeLabel[type]}</h3><span className="muted text-xs">{report?.versions.length ?? 0}개 버전</span></div>{!report?.versions.length ? <p className="muted mt-3 text-sm">아직 제출된 버전이 없습니다.</p> : <ol className="mt-4 space-y-5">{report.versions.map((version, index) => <li key={version.id} className="bg-[var(--surface)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><a href={`/api/files/${version.fileId}`} className="flex min-h-11 items-center font-semibold text-[var(--accent-hover)] underline-offset-4 [overflow-wrap:anywhere] hover:underline">v{version.version} · {version.fileName}</a><p className="muted mt-1 text-xs">{version.submitterName} · {koreanDate.format(version.submittedAt)}</p></div>{version.decision ? <StatusBadge tone={version.decision.decision === "APPROVED" ? "success" : "warning"}>{version.decision.decision === "APPROVED" ? "승인" : "수정 요청"}</StatusBadge> : <StatusBadge tone="neutral">{index === 0 ? "검토 대기" : "이전 버전"}</StatusBadge>}</div>{version.description ? <p className="mt-3 text-sm">{version.description}</p> : null}{version.decision ? <p className="muted mt-3 text-sm">{version.decision.reviewerName} · {version.decision.comment || "의견 없음"}</p> : workspace.status === "CONFIRMED" && actor.role !== "STUDENT" && index === 0 ? <ReportDecisionForm teamId={workspace.id} reportVersionId={version.id} /> : null}</li>)}</ol>}</article>;
            })}
          </div>
        </section>
        <section aria-labelledby="artifacts-title" className="space-y-6">
          <div><p className="eyebrow">결과물</p><h2 id="artifacts-title" className="mt-1 text-2xl font-bold">결과물 및 발표 자료</h2></div>
          {workspace.status === "CONFIRMED" && actor.role !== "PROFESSOR" ? <div className="border-y border-[var(--line)] py-5"><ArtifactExternalForm teamId={workspace.id} /><ArtifactFileForm teamId={workspace.id} /></div> : null}
          {reportWorkspace.artifacts.length === 0 ? <EmptyState title="등록된 결과물이 없습니다" description={artifactEmptyDescription} /> : <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{reportWorkspace.artifacts.map((artifact) => <li key={artifact.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="font-semibold [overflow-wrap:anywhere]">{artifact.title}</p><p className="muted mt-1 text-xs">{artifactTypeLabel[artifact.type]} · {koreanDate.format(artifact.createdAt)}</p></div>{artifact.fileId ? <a className="button-quiet" href={`/api/files/${artifact.fileId}`}>파일 받기</a> : <a className="button-quiet" href={artifact.externalUrl} target="_blank" rel="noreferrer">링크 열기<span className="sr-only"> 새 창</span></a>}</li>)}</ul>}
        </section>
      </main>
    </AppShell>
  );
}
