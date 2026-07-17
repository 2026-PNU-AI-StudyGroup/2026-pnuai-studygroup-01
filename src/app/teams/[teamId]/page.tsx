import type { Metadata } from "next";
import Link from "next/link";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 개요" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

export default async function TeamOverviewPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace } = await loadTeamWorkspace(teamId);
  const destinations = [
    ["마일스톤", "목표와 완료 예정일, 현재 상태를 관리합니다.", `/teams/${teamId}/milestones`, `${workspace.completedMilestoneCount} / ${workspace.milestoneCount} 완료`],
    ["진행 기록", "수행 내용과 위험 요소, 다음 행동을 남깁니다.", `/teams/${teamId}/progress`, `${workspace.progressTotal}개 기록`],
    ["팀 토론", "팀원과 지도교수가 의견을 나눕니다.", `/teams/${teamId}/discussion`, `${workspace.discussionTotal}개 글`],
    ["보고서", "보고서 제출과 교수의 웹 승인을 확인합니다.", `/teams/${teamId}/reports`, "제출·승인 관리"],
    ["결과물", "발표 영상, 소스 코드와 포스터를 관리합니다.", `/teams/${teamId}/artifacts`, "최종 산출물"],
  ] as const;
  return <div className="space-y-12">
    <section aria-labelledby="members-title" className="border-y border-[var(--line)] py-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3"><h2 id="members-title" className="text-sm font-bold">팀원 {workspace.members.length}명</h2>{workspace.members.map((member) => <span key={member.id} className="text-sm"><strong>{member.name}</strong><span className="muted ml-2 hidden sm:inline">{member.email}</span></span>)}</div>
    </section>
    <section aria-labelledby="schedule-title"><p className="eyebrow">일정</p><h2 id="schedule-title" className="mt-1 text-xl font-bold">프로젝트 일정</h2><dl className="mt-4 grid gap-4 border-y border-[var(--line)] py-5 text-sm md:grid-cols-3"><div><dt className="muted text-xs">모집 기간</dt><dd className="mt-1 font-medium">{koreanDate.format(workspace.schedule.recruitmentStartsAt)} – {koreanDate.format(workspace.schedule.recruitmentEndsAt)}</dd></div><div><dt className="muted text-xs">수행 기간</dt><dd className="mt-1 font-medium">{koreanDate.format(workspace.schedule.executionStartsAt)} – {koreanDate.format(workspace.schedule.executionEndsAt)}</dd></div><div><dt className="muted text-xs">제출 기간</dt><dd className="mt-1 font-medium">{koreanDate.format(workspace.schedule.submissionStartsAt)} – {koreanDate.format(workspace.schedule.submissionEndsAt)}</dd></div></dl></section>
    <section aria-labelledby="workspace-destinations"><div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4"><div><p className="eyebrow">작업 영역</p><h2 id="workspace-destinations" className="mt-1 text-xl font-bold">어떤 작업을 할까요?</h2></div><StatusBadge>{workspace.status === "CLOSED" ? "읽기 전용" : "운영 중"}</StatusBadge></div><ul className="divide-y divide-[var(--line)]">{destinations.map(([title, description, href, meta]) => <li key={href}><Link href={href} className="group grid min-h-24 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><h3 className="font-extrabold group-hover:text-[var(--primary-hover)]">{title}</h3><p className="muted mt-1 text-sm">{description}</p></div><span className="flex items-center gap-3 text-sm font-semibold">{meta}<span aria-hidden="true" className="project-row-arrow">→</span></span></Link></li>)}</ul></section>
  </div>;
}
