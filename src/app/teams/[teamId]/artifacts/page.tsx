import type { Metadata } from "next";

import { ArtifactRegistrationForm } from "@/app/teams/[teamId]/_components/artifact-registration-form";
import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 결과물" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const artifactTypeLabel = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function TeamArtifactsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 등록된 결과물이 없습니다." : actor.role === "PROFESSOR" ? "팀원이 결과물을 등록하면 이곳에서 확인할 수 있습니다." : workspace.status === "FORMING" ? "팀 확정 후 결과물을 등록할 수 있습니다." : "소스 코드, 발표 영상, 포스터를 파일 또는 HTTPS 링크로 등록하세요.";
  return <section aria-labelledby="artifacts-title" className="space-y-8"><header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-7"><div><p className="eyebrow">프로젝트 결과</p><h1 id="artifacts-title" className="mt-2 text-3xl font-black tracking-[-0.04em]">결과물 및 발표 자료</h1><p className="muted mt-2">최종 산출물을 등록하고 지난 프로젝트 공개 자료로 이어갑니다.</p></div>{workspace.status === "CONFIRMED" && actor.role !== "PROFESSOR" ? <ArtifactRegistrationForm teamId={workspace.id} /> : null}</header>{reportWorkspace.artifacts.length === 0 ? <EmptyState title="등록된 결과물이 없습니다" description={emptyDescription} /> : <div><div className="hidden grid-cols-[8rem_minmax(0,1fr)_9rem_7rem] border-b border-[var(--primary)] px-2 pb-3 text-xs font-bold text-[var(--muted)] sm:grid"><span>유형</span><span>결과물</span><span>등록일</span><span className="text-right">열기</span></div><ul className="divide-y divide-[var(--line)] border-b border-[var(--line)]">{reportWorkspace.artifacts.map((artifact) => <li key={artifact.id} className="grid gap-3 px-2 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_9rem_7rem] sm:items-center"><span className="text-sm font-semibold text-[var(--primary-hover)]">{artifactTypeLabel[artifact.type]}</span><p className="font-semibold [overflow-wrap:anywhere]">{artifact.title}</p><time className="muted text-sm" dateTime={artifact.createdAt.toISOString()}>{koreanDate.format(artifact.createdAt)}</time>{artifact.fileId ? <a className="button-quiet sm:justify-self-end" href={`/api/files/${artifact.fileId}`}>파일 받기</a> : <a className="button-quiet sm:justify-self-end" href={artifact.externalUrl} target="_blank" rel="noreferrer">링크 열기<span className="sr-only"> 새 창</span></a>}</li>)}</ul></div>}</section>;
}
