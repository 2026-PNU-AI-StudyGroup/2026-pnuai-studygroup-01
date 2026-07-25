import type { Metadata } from "next";
import Link from "next/link";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { ChevronRightIcon } from "@/app/teams/[teamId]/_components/workspace-icons";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 개요" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

export default async function TeamOverviewPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const destinations = [
    ["마일스톤", "목표와 완료 예정일", `/teams/${teamId}/milestones`, `${workspace.completedMilestoneCount} / ${workspace.milestoneCount} 완료`],
    ["팀 대화", "아이디어와 피드백", `/teams/${teamId}/discussion`, `${workspace.discussionTotal}개 글`],
    ["보고서", "제출 버전과 교수 승인", `/teams/${teamId}/reports`, "제출·승인 관리"],
    ["결과물", "발표 자료와 소스 코드", `/teams/${teamId}/artifacts`, "최종 산출물"],
  ] as const;
  const nextMilestone = workspace.milestones
    .filter((milestone) => milestone.status !== "DONE")
    .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())[0];
  const schedule = [
    ["모집", workspace.schedule.recruitmentStartsAt, workspace.schedule.recruitmentEndsAt],
    ["수행", workspace.schedule.executionStartsAt, workspace.schedule.executionEndsAt],
    ["제출", workspace.schedule.submissionStartsAt, workspace.schedule.submissionEndsAt],
  ] as const;

  return (
    <div className="space-y-10">
      <WorkspacePageHeader
        eyebrow="프로젝트 작업실"
        title={workspace.topicTitle}
        description="일정과 현재 작업을 확인하고, 다음 실행으로 바로 이어가세요."
        meta={<StatusBadge tone={workspace.status === "CLOSED" ? "neutral" : "info"}>{workspace.status === "CLOSED" ? "읽기 전용" : "프로젝트 운영 중"}</StatusBadge>}
      />

      <section aria-labelledby="next-action-title" className="grid gap-3 border-b border-[var(--line)] pb-7 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center">
        <p className="text-xs font-extrabold text-[var(--primary)]">다음 일정</p>
        <h2 id="next-action-title" className="text-lg font-extrabold">{nextMilestone?.title ?? "등록된 마일스톤이 없습니다"}</h2>
        <time className="text-sm font-bold" dateTime={nextMilestone?.dueAt.toISOString()}>
          {nextMilestone ? `${koreanDate.format(nextMilestone.dueAt)}까지` : `${koreanDate.format(workspace.schedule.executionEndsAt)} 수행 종료`}
        </time>
      </section>

      {actor.role === "PROFESSOR" && workspace.status !== "CLOSED" ? (
        <section aria-labelledby="professor-actions-title" className="grid gap-5 border-y border-[var(--line)] bg-[var(--primary-subtle)] px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="eyebrow">지도교수 작업</p>
            <h2 id="professor-actions-title" className="mt-1 text-lg font-extrabold">팀 피드백과 보고서 검토</h2>
            <p className="muted mt-1 text-sm">팀 대화에 의견을 남기거나 제출된 보고서를 검토할 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href={`/teams/${teamId}/discussion`} className="button-primary">지도 의견 남기기</Link><Link href={`/teams/${teamId}/reports`} className="button-secondary">보고서 관리</Link></div>
        </section>
      ) : null}

      <section aria-labelledby="schedule-title">
        <div className="border-b border-[var(--line)] pb-3"><p className="eyebrow">일정</p><h2 id="schedule-title" className="mt-1 text-xl font-extrabold">프로젝트 기간</h2></div>
        <ol className="grid border-b border-[var(--line)] sm:grid-cols-3">
          {schedule.map(([label, start, end]) => (
            <li key={label} className="relative border-b border-[var(--line)] py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
              <span aria-hidden="true" className="block size-2 rounded-full bg-[var(--primary)]" />
              <h3 className="mt-3 font-extrabold">{label} 기간</h3>
              <p className="muted mt-1 text-sm">{koreanDate.format(start)} – {koreanDate.format(end)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="workspace-destinations">
        <div className="border-b border-[var(--line)] pb-3"><p className="eyebrow">작업 영역</p><h2 id="workspace-destinations" className="mt-1 text-xl font-extrabold">프로젝트 작업</h2></div>
        <ul className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {destinations.map(([title, description, href, meta]) => (
            <li key={href}>
              <Link href={href} className="group grid min-h-20 gap-2 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
                <h3 className="font-extrabold group-hover:text-[var(--primary-hover)]">{title}</h3>
                <p className="muted text-sm">{description}</p>
                <span className="flex items-center gap-2 text-sm font-semibold">{meta}<ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="members-title">
        <div className="border-b border-[var(--line)] pb-3"><p className="eyebrow">구성원</p><h2 id="members-title" className="mt-1 text-xl font-extrabold">팀원 {workspace.members.length}명</h2></div>
        <ul className="grid border-b border-[var(--line)] sm:grid-cols-2">
          {workspace.members.map((member) => <li key={member.id} className="border-b border-[var(--line)] py-4 last:border-b-0 sm:border-r sm:px-4 sm:odd:pl-0 sm:even:border-r-0"><strong className="block">{member.name}</strong><span className="muted mt-1 block text-sm [overflow-wrap:anywhere]">{member.email}</span></li>)}
        </ul>
      </section>
    </div>
  );
}
