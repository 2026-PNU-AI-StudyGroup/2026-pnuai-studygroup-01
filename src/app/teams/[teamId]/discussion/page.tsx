import type { Metadata } from "next";
import Link from "next/link";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { DiscussionPostForm } from "@/app/teams/[teamId]/_components/discussion-post-form";
import { EmptyState } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "팀 대화" };
const koreanDay = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short" });
const koreanTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

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

export default async function TeamDiscussionPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ page?: SearchParamValue }> }) {
  const { teamId } = await params;
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const { actor, workspace } = await loadTeamWorkspace(teamId, requestedPage);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 나눈 대화가 없습니다." : "첫 질문이나 의견을 남겨 프로젝트 대화를 시작하세요.";
  const participants = [
    { id: `professor-${workspace.professorName}`, name: workspace.professorName, role: "지도교수" },
    ...workspace.members.map((member) => ({ id: member.id, name: member.name, role: "팀원" })),
  ];

  return (
    <section aria-labelledby="discussion-title" className="flex min-h-[calc(100vh-5rem)] flex-col">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-6">
        <div className="max-w-2xl">
          <p className="eyebrow">프로젝트 채널</p>
          <h1 id="discussion-title" className="mt-2 text-[clamp(1.75rem,4vw,2.25rem)] font-black leading-tight tracking-[-0.045em]">팀 대화</h1>
          <p className="muted mt-2 text-sm leading-6 sm:text-base">프로젝트 결정과 피드백을 팀원과 바로 공유합니다.</p>
        </div>
        <p className="muted text-sm"><strong className="font-bold text-[var(--ink)]">{participants.length}명</strong> 참여 · 메시지 {workspace.discussionTotal}개</p>
      </header>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-h-[38rem] min-w-0 flex-col xl:border-r xl:border-[var(--line)]">
          {workspace.discussionTotalPages > 1 ? (
            <nav aria-label="팀 대화 페이지" className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-4 xl:pr-8">
              <span className="muted text-xs">{workspace.discussionPage} / {workspace.discussionTotalPages} 페이지</span>
              <div className="flex gap-2">
                {workspace.discussionPage > 1 ? <Link className="button-quiet" href={`/teams/${teamId}/discussion?page=${workspace.discussionPage - 1}`}>최근 대화</Link> : null}
                {workspace.discussionPage < workspace.discussionTotalPages ? <Link className="button-quiet" href={`/teams/${teamId}/discussion?page=${workspace.discussionPage + 1}`}>이전 대화</Link> : null}
              </div>
            </nav>
          ) : null}

          {workspace.discussionPosts.length === 0 ? (
            <div className="grid flex-1 place-items-center py-16 xl:pr-8">
              <EmptyState title="아직 나눈 대화가 없습니다" description={emptyDescription} />
            </div>
          ) : (
            <ol className="flex-1 space-y-6 py-8 xl:pr-8">
              {workspace.discussionPosts.map((post, index) => {
                const own = post.authorId === actor.id;
                const previous = workspace.discussionPosts[index - 1];
                const startsNewDay = !previous || dayKey.format(previous.createdAt) !== dayKey.format(post.createdAt);
                return (
                  <li key={post.id}>
                    {startsNewDay ? (
                      <div className="mb-6 flex items-center gap-4" aria-label={koreanDay.format(post.createdAt)}>
                        <span className="h-px flex-1 bg-[var(--line)]" />
                        <time className="muted text-xs font-semibold" dateTime={post.createdAt.toISOString()}>{koreanDay.format(post.createdAt)}</time>
                        <span className="h-px flex-1 bg-[var(--line)]" />
                      </div>
                    ) : null}
                    <article className={`flex items-start gap-3 ${own ? "flex-row-reverse" : ""}`} aria-label={`${post.authorName}의 메시지`}>
                      <PersonIcon own={own} />
                      <div className={`min-w-0 max-w-[46rem] ${own ? "text-right" : ""}`}>
                        <div className={`mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${own ? "justify-end" : ""}`}>
                          <strong className="text-sm">{post.authorName}</strong>
                          <time className="muted text-xs" dateTime={post.createdAt.toISOString()}>{koreanTime.format(post.createdAt)}</time>
                        </div>
                        <div className={`rounded-xl border px-4 py-3 text-left [&_button]:min-h-8 [&_button]:px-2.5 ${own ? "border-[color-mix(in_srgb,var(--primary)_24%,var(--line))] bg-[var(--primary-subtle)]" : "border-[var(--line)] bg-[var(--surface-subtle)]"}`}>
                          <TranslatedText text={post.content} className="text-base leading-7" />
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}

          {workspace.status !== "CLOSED" ? <DiscussionPostForm teamId={workspace.id} authorName={actor.name} /> : (
            <p className="border-t border-[var(--line)] py-5 text-sm text-[var(--muted)]">종료된 프로젝트에서는 새 메시지를 보낼 수 없습니다.</p>
          )}
        </div>

        <aside aria-label="대화 참여자" className="hidden px-6 py-8 xl:block">
          <div className="sticky top-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-extrabold">참여자</h2>
              <span className="muted text-xs">{participants.length}</span>
            </div>
            <ul className="mt-5 space-y-4">
              {participants.map((participant) => (
                <li key={participant.id} className="flex min-w-0 items-center gap-3">
                  <PersonIcon />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{participant.name}</p>
                    <p className="muted mt-0.5 text-xs">{participant.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
