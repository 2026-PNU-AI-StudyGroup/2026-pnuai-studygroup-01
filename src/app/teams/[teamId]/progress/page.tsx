import type { Metadata } from "next";
import Link from "next/link";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { ProgressUpdateForm } from "@/app/teams/[teamId]/workspace-forms";
import { EmptyState } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "프로젝트 진행 기록" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

export default async function TeamProgressPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ page?: SearchParamValue }> }) {
  const { teamId } = await params;
  const requestedPage = Number(firstSearchParam((await searchParams).page) ?? "1");
  const { actor, workspace } = await loadTeamWorkspace(teamId, 1, requestedPage);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 등록된 진행 기록이 없습니다." : actor.role === "PROFESSOR" ? "팀원이 진행 기록을 남기면 이곳에서 확인할 수 있습니다." : "아직 진행 기록이 없습니다. 첫 수행 내용을 남겨 주세요.";
  return <section aria-labelledby="updates-title" className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">수행 과정</p><h2 id="updates-title" className="mt-1 text-3xl font-bold">진행 기록</h2><p className="muted mt-2 text-sm">완료한 내용, 위험 요소와 다음 행동을 시간순으로 확인합니다.</p></div>{workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <ProgressUpdateForm teamId={workspace.id} /> : null}</div>{workspace.progressUpdates.length === 0 ? <EmptyState title="진행 기록이 없습니다" description={emptyDescription} /> : <ol className="border-l border-[var(--line)] pl-5">{workspace.progressUpdates.map((update) => <li key={update.id} className="relative pb-8 before:absolute before:-left-[1.45rem] before:top-1 before:size-2 before:rounded-full before:bg-[var(--primary)]"><div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">{update.authorName}</strong><time dateTime={update.createdAt.toISOString()}>{koreanDate.format(update.createdAt)}</time></div><p className="mt-2 whitespace-pre-wrap leading-7">{update.content}</p>{update.risk ? <p className="mt-3 border-l-2 border-[var(--warning)] pl-3 text-sm text-[var(--warning-ink)]">위험 · {update.risk}</p> : null}{update.nextAction ? <p className="mt-2 text-sm font-medium">다음 행동 · {update.nextAction}</p> : null}</li>)}</ol>}{workspace.progressTotalPages > 1 ? <nav aria-label="진행 기록 이력 페이지" className="flex flex-wrap items-center justify-between gap-3"><span className="muted text-sm">{workspace.progressPage} / {workspace.progressTotalPages} 페이지 · 총 {workspace.progressTotal}개</span><div className="flex gap-2">{workspace.progressPage > 1 ? <Link className="button-quiet" href={`/teams/${teamId}/progress?page=${workspace.progressPage - 1}`}>최근 기록</Link> : null}{workspace.progressPage < workspace.progressTotalPages ? <Link className="button-quiet" href={`/teams/${teamId}/progress?page=${workspace.progressPage + 1}`}>이전 기록</Link> : null}</div></nav> : null}</section>;
}
