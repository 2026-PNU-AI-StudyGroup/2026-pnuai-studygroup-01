import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiArticle } from "@/modules/translation/ui/localized-elements";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { AutoRefresh } from "@/shared/ui/auto-refresh";
import { DiscussionPostForm } from "@/app/projects/[projectId]/_components/discussion-post-form";
import { EmptyState } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/app/_components/translated-text";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀 대화");
}
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const discussionScrollContainerId = "team-discussion-messages";
const authorRoleLabel = { ADMIN: "관리자", PROFESSOR: "교수", ASSISTANT: "조교", STUDENT: "학생" } as const;

function PersonIcon({ own = false }: { own?: boolean }) {
  return (
    <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full ${own ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>
      <svg viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]" strokeLinecap="round">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20c.4-4.2 2.6-6.2 6.5-6.2s6.1 2 6.5 6.2" />
      </svg>
    </span>
  );
}

export default async function TeamDiscussionPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ page?: SearchParamValue }> }) {
  const { projectId } = await params;
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId, requestedPage);
  const emptyDescription = workspace.status === "COMPLETED" ? "프로젝트 종료 전에 나눈 대화가 없습니다." : "질문이나 의견을 작성해 대화를 시작하세요.";
  const participantCount = workspace.members.length + workspace.assistants.length + (workspace.advisorEnabled ? 1 : 0);

  return (
    <section aria-labelledby="discussion-title" className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-6 lg:h-[calc(100vh-5rem)] lg:min-h-[38rem]">
      {workspace.status !== "COMPLETED" && workspace.discussionPage === 1 ? <AutoRefresh /> : null}
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <h1 id="discussion-title" className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold leading-tight tracking-[-0.045em]"><UiText>{"팀 대화"}</UiText></h1>
        </div>
        <p className="muted text-sm"><strong className="font-semibold text-[var(--ink)]">{participantCount}<UiText>{"명"}</UiText></strong> {" "}<UiText>{"참여 · 메시지"}</UiText>{" "}{workspace.discussionTotal}<UiText>{"개"}</UiText></p>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] shadow-[0_12px_34px_rgba(31,35,48,0.06)]">
        <div className="flex h-full min-h-[38rem] min-w-0 flex-col lg:min-h-0">
          {workspace.discussionTotalPages > 1 ? (
            <UiNav aria-label="팀 대화 페이지" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6 lg:px-7">
              <span className="muted text-xs">{workspace.discussionPage} / {workspace.discussionTotalPages} {" "}<UiText>{"페이지"}</UiText></span>
              <div className="flex gap-2">
                {workspace.discussionPage > 1 ? <Link className="button-quiet" href={`/projects/${projectId}/discussion?page=${workspace.discussionPage - 1}`}><UiText>{"최근 대화"}</UiText></Link> : null}
                {workspace.discussionPage < workspace.discussionTotalPages ? <Link className="button-quiet" href={`/projects/${projectId}/discussion?page=${workspace.discussionPage + 1}`}><UiText>{"이전 대화"}</UiText></Link> : null}
              </div>
            </UiNav>
          ) : null}

          <div
            id={discussionScrollContainerId}
            data-discussion-scroll-container
            role="log"
            aria-labelledby="discussion-title"
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6 lg:px-7 [overscroll-behavior:contain] [scrollbar-gutter:stable]"
          >
            {workspace.discussionPosts.length === 0 ? (
              <div className="grid min-h-full place-items-center py-16">
                <EmptyState title="아직 나눈 대화가 없습니다" description={emptyDescription} variant="section" />
              </div>
            ) : (
              <ol className="space-y-6 py-7">
                {workspace.discussionPosts.map((post, index) => {
                  const own = post.authorId === actor.id;
                  const previous = workspace.discussionPosts[index - 1];
                  const startsNewDay = !previous || dayKey.format(previous.createdAt) !== dayKey.format(post.createdAt);
                  return (
                    <li key={post.id}>
                      {startsNewDay ? (
                        <div className="mb-6 flex items-center gap-4" aria-label={post.createdAt.toISOString()}>
                          <span className="h-px flex-1 bg-[var(--line)]" />
                          <time className="muted text-xs font-semibold" dateTime={post.createdAt.toISOString()}><UiDate value={post.createdAt} mode="day" /></time>
                          <span className="h-px flex-1 bg-[var(--line)]" />
                        </div>
                      ) : null}
                      <UiArticle className={`flex items-start gap-3 ${own ? "flex-row-reverse" : ""}`} aria-label={`${post.authorName}의 메시지`}>
                        <PersonIcon own={own} />
                        <div className={`min-w-0 max-w-[46rem] ${own ? "text-right" : ""}`}>
                          <div className={`mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${own ? "justify-end" : ""}`}>
                            <strong className="text-sm">{post.authorName}</strong>
                            <span className="text-xs font-normal text-[var(--muted)]">{authorRoleLabel[post.authorRole]}</span>
                            <time className="muted text-xs" dateTime={post.createdAt.toISOString()}><UiDate value={post.createdAt} mode="time" /></time>
                          </div>
                          <div className={`rounded-xl border px-4 py-3 text-left [&_button]:min-h-8 [&_button]:px-2.5 ${own ? "border-[color-mix(in_srgb,var(--primary)_24%,var(--line))] bg-[var(--primary-subtle)]" : "border-[var(--line-strong)] bg-[var(--surface-subtle)] shadow-[0_1px_2px_rgba(31,35,48,0.04)]"}`}>
                            <TranslatedText text={post.content} className="text-base leading-7" />
                          </div>
                        </div>
                      </UiArticle>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {workspace.status !== "COMPLETED" ? <DiscussionPostForm teamId={workspace.id} projectId={projectId} authorName={actor.name} scrollContainerId={discussionScrollContainerId} latestPostId={workspace.discussionPosts.at(-1)?.id} autoScrollToLatest={workspace.discussionPage === 1} /> : (
            <p className="shrink-0 border-t border-[var(--line)] px-5 py-5 text-sm text-[var(--muted)] sm:px-6 lg:px-7"><UiText>{"종료된 프로젝트에서는 새 메시지를 보낼 수 없습니다."}</UiText></p>
          )}
        </div>
      </div>
    </section>
  );
}
