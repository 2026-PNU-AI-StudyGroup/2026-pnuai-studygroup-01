import type { Metadata } from "next";
import Link from "next/link";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { DiscussionPostForm } from "@/app/teams/[teamId]/workspace-forms";
import { EmptyState } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "팀 토론" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

export default async function TeamDiscussionPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ page?: SearchParamValue }> }) {
  const { teamId } = await params;
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const { workspace } = await loadTeamWorkspace(teamId, requestedPage, 1);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 등록된 토론이 없습니다." : "첫 질문이나 의견을 남겨 프로젝트 논의를 시작하세요.";
  return <section aria-labelledby="discussion-title" className="space-y-6"><div><p className="eyebrow">소통</p><h2 id="discussion-title" className="mt-1 text-3xl font-bold">팀 토론</h2><p className="muted mt-2 text-sm">팀원과 지도교수가 의견을 공유합니다. 필요한 글은 한국어 또는 영어로 바로 번역할 수 있습니다.</p></div>{workspace.status !== "CLOSED" ? <DiscussionPostForm teamId={workspace.id} /> : null}{workspace.discussionPosts.length === 0 ? <EmptyState title="아직 토론이 없습니다" description={emptyDescription} /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{workspace.discussionPosts.map((post) => <li key={post.id} className="py-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{post.authorName}</strong><time className="muted text-xs" dateTime={post.createdAt.toISOString()}>{koreanDate.format(post.createdAt)}</time></div><TranslatedText text={post.content} className="text-sm leading-7" /></li>)}</ol>}{workspace.discussionTotalPages > 1 ? <nav aria-label="팀 토론 이력 페이지" className="flex flex-wrap items-center justify-between gap-3"><span className="muted text-sm">{workspace.discussionPage} / {workspace.discussionTotalPages} 페이지 · 총 {workspace.discussionTotal}개</span><div className="flex gap-2">{workspace.discussionPage > 1 ? <Link className="button-quiet" href={`/teams/${teamId}/discussion?page=${workspace.discussionPage - 1}`}>최근 기록</Link> : null}{workspace.discussionPage < workspace.discussionTotalPages ? <Link className="button-quiet" href={`/teams/${teamId}/discussion?page=${workspace.discussionPage + 1}`}>이전 기록</Link> : null}</div></nav> : null}</section>;
}
