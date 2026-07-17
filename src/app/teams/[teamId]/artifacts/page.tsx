import type { Metadata } from "next";

import { ArtifactRegistrationForm } from "@/app/teams/[teamId]/report-forms";
import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 결과물" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const artifactTypeLabel = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function TeamArtifactsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 등록된 결과물이 없습니다." : actor.role === "PROFESSOR" ? "팀원이 결과물을 등록하면 이곳에서 확인할 수 있습니다." : workspace.status === "FORMING" ? "팀 확정 후 결과물을 등록할 수 있습니다." : "소스 코드, 발표 영상, 포스터를 파일 또는 HTTPS 링크로 등록하세요.";
  return <section aria-labelledby="artifacts-title" className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">프로젝트 결과</p><h2 id="artifacts-title" className="mt-1 text-3xl font-bold">결과물 및 발표 자료</h2><p className="muted mt-2 text-sm">최종 산출물을 한곳에서 등록하고 지난 프로젝트 공개 자료로 이어갑니다.</p></div>{workspace.status === "CONFIRMED" && actor.role !== "PROFESSOR" ? <ArtifactRegistrationForm teamId={workspace.id} /> : null}</div>{reportWorkspace.artifacts.length === 0 ? <EmptyState title="등록된 결과물이 없습니다" description={emptyDescription} /> : <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{reportWorkspace.artifacts.map((artifact) => <li key={artifact.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="font-semibold [overflow-wrap:anywhere]">{artifact.title}</p><p className="muted mt-1 text-xs">{artifactTypeLabel[artifact.type]} · {koreanDate.format(artifact.createdAt)}</p></div>{artifact.fileId ? <a className="button-quiet" href={`/api/files/${artifact.fileId}`}>파일 받기</a> : <a className="button-quiet" href={artifact.externalUrl} target="_blank" rel="noreferrer">링크 열기<span className="sr-only"> 새 창</span></a>}</li>)}</ul>}</section>;
}
