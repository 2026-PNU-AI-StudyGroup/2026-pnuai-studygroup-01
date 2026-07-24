import type { Metadata } from "next";
import Link from "next/link";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 개요" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

export default async function TeamOverviewPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const destinations = [
    ["마일스톤", "목표와 완료 예정일", `/teams/${teamId}/milestones`, `${workspace.completedMilestoneCount} / ${workspace.milestoneCount} 완료`],
    ["진행 기록", "수행 내용과 다음 행동", `/teams/${teamId}/progress`, `${workspace.progressTotal}개 기록`],
    ["팀 대화", "아이디어와 피드백", `/teams/${teamId}/discussion`, `${workspace.discussionTotal}개 글`],
    ["보고서", "제출 버전과 교수 승인", `/teams/${teamId}/reports`, "제출·승인 관리"],
    ["결과물", "발표 자료와 소스 코드", `/teams/${teamId}/artifacts`, "최종 산출물"],
  ] as const;
  const nextMilestone = workspace.milestones
    .filter((milestone) => milestone.status !== "DONE")
    .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())[0];

  return (
    <div className="space-y-10">
      <header className="border-b border-[var(--line)] pb-8">
        <p className="eyebrow">프로젝트 개요</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-black leading-tight tracking-[-0.045em]">{workspace.topicTitle}</h1>
            <p className="muted mt-3 text-base">팀의 일정과 현재 작업을 한눈에 확인하세요.</p>
          </div>
          <StatusBadge tone={workspace.status === "CLOSED" ? "neutral" : "info"}>{workspace.status === "CLOSED" ? "읽기 전용" : "프로젝트 운영 중"}</StatusBadge>
        </div>
      </header>

      {actor.role === "PROFESSOR" && workspace.status !== "CLOSED" ? (
        <section aria-labelledby="professor-actions-title" className="rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--surface-subtle)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div><p className="eyebrow">지도교수 작업</p><h2 id="professor-actions-title" className="mt-1 text-xl font-extrabold">팀에 피드백을 남기고 다음 단계를 이끌어 주세요</h2><p className="muted mt-2 text-sm">팀 대화는 모두에게 공유되며, 보고서에서 일정과 승인 의견을 정할 수 있습니다.</p></div>
          <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0"><Link href={`/teams/${teamId}/discussion`} className="button-primary">지도 의견 남기기</Link><Link href={`/teams/${teamId}/reports`} className="button-secondary">보고서 관리</Link></div>
        </section>
      ) : null}

      <section aria-labelledby="next-action-title" className="border-l-2 border-[var(--accent)] py-1 pl-5">
        <p className="text-xs font-extrabold text-[var(--accent-ink)]">다음 일정</p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="next-action-title" className="text-xl font-extrabold">{nextMilestone?.title ?? "등록된 마일스톤이 없습니다"}</h2>
          <time className="text-sm font-bold text-[var(--accent-ink)]" dateTime={nextMilestone?.dueAt.toISOString()}>{nextMilestone ? `${koreanDate.format(nextMilestone.dueAt)}까지` : `${koreanDate.format(workspace.schedule.executionEndsAt)} 수행 종료`}</time>
        </div>
      </section>

      <section aria-labelledby="schedule-title">
        <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
          <div><p className="eyebrow">일정</p><h2 id="schedule-title" className="mt-1 text-xl font-extrabold">프로젝트 기간</h2></div>
        </div>
        <dl className="divide-y divide-[var(--line)]">
          <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]"><dt className="muted text-sm">모집 기간</dt><dd className="font-semibold">{koreanDate.format(workspace.schedule.recruitmentStartsAt)} – {koreanDate.format(workspace.schedule.recruitmentEndsAt)}</dd></div>
          <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]"><dt className="muted text-sm">수행 기간</dt><dd className="font-semibold">{koreanDate.format(workspace.schedule.executionStartsAt)} – {koreanDate.format(workspace.schedule.executionEndsAt)}</dd></div>
          <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]"><dt className="muted text-sm">제출 기간</dt><dd className="font-semibold">{koreanDate.format(workspace.schedule.submissionStartsAt)} – {koreanDate.format(workspace.schedule.submissionEndsAt)}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="workspace-destinations">
        <div className="border-b border-[var(--primary)] pb-3"><p className="eyebrow">작업 영역</p><h2 id="workspace-destinations" className="mt-1 text-xl font-extrabold">프로젝트 작업</h2></div>
        <ul className="divide-y divide-[var(--line)]">
          {destinations.map(([title, description, href, meta]) => (
            <li key={href}>
              <Link href={href} className="group grid min-h-20 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-baseline gap-4"><h3 className="min-w-24 font-extrabold group-hover:text-[var(--primary-hover)]">{title}</h3><p className="muted text-sm">{description}</p></div>
                <span className="flex items-center gap-3 text-sm font-semibold">{meta}<span aria-hidden="true" className="project-row-arrow">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="members-title">
        <div className="border-b border-[var(--line)] pb-3"><p className="eyebrow">구성원</p><h2 id="members-title" className="mt-1 text-xl font-extrabold">팀원 {workspace.members.length}명</h2></div>
        <ul className="divide-y divide-[var(--line)]">{workspace.members.map((member) => <li key={member.id} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr]"><strong>{member.name}</strong><span className="muted text-sm">{member.email}</span></li>)}</ul>
      </section>
    </div>
  );
}
