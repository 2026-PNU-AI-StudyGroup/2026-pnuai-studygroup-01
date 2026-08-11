import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { TopicApprovalDecisionForm } from "@/app/_components/topic-approval-decision-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicApprovalService, type TopicApprovalRequestDetail } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 승인 요청 상세");
}

const statusView = {
  PENDING: ["검토 대기", "info"],
  APPROVED: ["승인", "success"],
  REJECTED: ["반려", "danger"],
} as const;

const applicationModeLabel = {
  TEAM_ONLY: "팀 지원만",
  INDIVIDUAL_ONLY: "개인 지원만",
  INDIVIDUAL_OR_TEAM: "개인·팀 지원",
} as const;

function Period({ label, start, end }: { label: string; start: Date; end: Date }) {
  return (
    <div>
      <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className="mt-1 text-sm font-semibold"><UiDate value={start} mode="dateTime" /> <span aria-hidden="true">–</span> <UiDate value={end} mode="dateTime" /></dd>
    </div>
  );
}

function ApprovalDetail({ request, canDecide }: { request: TopicApprovalRequestDetail; canDecide: boolean }) {
  const route = request.route === "PROFESSOR" ? `${request.requestedProfessorName ?? "지정 교수"} 교수` : "관리자";
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-8">
        <section aria-labelledby="approval-summary-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={statusView[request.status][1]}><UiText>{statusView[request.status][0]}</UiText></StatusBadge>
            <span className="text-sm font-semibold text-[var(--muted)]"><UiText>{request.programCategory}</UiText> · <UiText>{request.programName}</UiText></span>
          </div>
          <h2 id="approval-summary-title" className="mt-4 text-2xl font-bold tracking-[-0.035em]"><UiText>{request.topicTitle}</UiText></h2>
          <p className="mt-5 whitespace-pre-wrap text-[0.9375rem] leading-7 text-[var(--ink)]"><UiText>{request.description}</UiText></p>
          <dl className="mt-6 grid gap-4 border-t border-[var(--line)] pt-5 text-sm sm:grid-cols-3">
            <div><dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"제안자"}</UiText></dt><dd className="mt-1 font-semibold">{request.requesterName}</dd></div>
            <div><dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"검토 요청 대상"}</UiText></dt><dd className="mt-1 font-semibold">{route}</dd></div>
            <div><dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"모집 정원"}</UiText></dt><dd className="mt-1 font-semibold">{request.capacity}<UiText>{"명"}</UiText> · <UiText>{applicationModeLabel[request.applicationMode]}</UiText></dd></div>
          </dl>
        </section>

        <section aria-labelledby="approval-requirements-title">
          <h2 id="approval-requirements-title" className="text-xl font-bold"><UiText>{"지원 조건"}</UiText></h2>
          <dl className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {[
              ["필수 기술", request.requiredSkills.join(", ") || "별도 조건 없음"],
              ["우대 기술", request.preferredSkills.join(", ") || "별도 조건 없음"],
              ["예상 역할", request.roleExpectations],
              ["활동 조건", request.availabilityRequirement],
            ].map(([label, value]) => <div key={label} className="grid gap-2 py-4 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="font-semibold leading-7"><UiText>{value}</UiText></dd></div>)}
          </dl>
        </section>

        <section aria-labelledby="approval-questions-title">
          <h2 id="approval-questions-title" className="text-xl font-bold"><UiText>{"지원서 문항"}</UiText></h2>
          <ol className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {request.applicationQuestions.map((question, index) => <li key={question.id} className="grid gap-2 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto]"><strong className="text-[var(--primary)]">{index + 1}</strong><span className="font-semibold"><UiText>{question.label}</UiText></span><span className="text-xs text-[var(--muted)]"><UiText>{question.required ? "필수" : "선택"}</UiText> · {question.maxLength}<UiText>{"자"}</UiText></span></li>)}
          </ol>
        </section>

        {request.studentTeam ? (
          <section aria-labelledby="approval-team-title">
            <h2 id="approval-team-title" className="text-xl font-bold"><UiText>{"승인 대상 기존 팀"}</UiText></h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{"승인 시 이 구성원 전원이 실행 팀으로 확정됩니다. 구성 변경이 있으면 새 제안이 필요합니다."}</UiText></p>
            <div className="mt-4 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
              <div className="border-b border-[var(--line)] px-5 py-4 font-bold"><UiText>{request.studentTeam.name}</UiText></div>
              <ul className="divide-y divide-[var(--line)]">
                {request.studentTeam.members.map((member) => <li key={member.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="font-semibold">{member.name} <span className="font-normal text-[var(--muted)]">{member.email}</span></span><StatusBadge tone={member.role === "LEADER" ? "info" : "neutral"}><UiText>{member.role === "LEADER" ? "팀장" : "팀원"}</UiText></StatusBadge></li>)}
              </ul>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-6">
        <section aria-labelledby="approval-schedule-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5">
          <h2 id="approval-schedule-title" className="text-lg font-bold"><UiText>{"프로그램 일정"}</UiText></h2>
          <dl className="mt-4 grid gap-5"><Period label="프로그램 모집 기간" start={request.programRecruitmentStartsAt} end={request.programRecruitmentEndsAt} /><Period label="수행 기간" start={request.programExecutionStartsAt} end={request.programExecutionEndsAt} /><Period label="제출 기간" start={request.programSubmissionStartsAt} end={request.programSubmissionEndsAt} /></dl>
        </section>
        {canDecide ? (
          <section aria-labelledby="approval-decision-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5">
            <h2 id="approval-decision-title" className="text-lg font-bold"><UiText>{"승인 결정"}</UiText></h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{"제안 내용과 일정을 모두 확인한 뒤 처리해 주세요."}</UiText></p>
            <div className="mt-4"><TopicApprovalDecisionForm requestId={request.id} studentTeamVersion={request.studentTeam ? request.studentTeamVersion : undefined} /></div>
          </section>
        ) : request.status !== "PENDING" ? (
          <section aria-labelledby="approval-result-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5">
            <h2 id="approval-result-title" className="text-lg font-bold"><UiText>{"검토 결과"}</UiText></h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6"><UiText>{request.reviewComment || "등록된 검토 의견이 없습니다."}</UiText></p>
            {request.decidedAt ? <p className="mt-3 text-xs text-[var(--muted)]"><UiDate value={request.decidedAt} mode="dateTime" /></p> : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
}

export default async function ProjectApprovalDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { requestId } = await params;
  const programs = new PrismaProjectProgramRepository(prisma);
  const request = await new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programs).get(actor, requestId);
  if (!request) notFound();
  const canDecide = request.status === "PENDING" && (actor.role === "PROFESSOR" || actor.role === "ADMIN");
  const backLink = <Link href="/project-approvals" className="button-secondary"><UiText>{"목록으로"}</UiText></Link>;
  const detail = <ApprovalDetail request={request} canDecide={canDecide} />;

  if (actor.role === "ADMIN") {
    return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals"><AdminWorkspace currentPath="/project-approvals" eyebrow={request.programName} title="프로젝트 승인 요청 상세" description="제안 내용, 지원 조건과 전체 일정을 확인합니다." actions={backLink}>{detail}</AdminWorkspace></AppShell>;
  }
  if (actor.role === "PROFESSOR") {
    return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals"><ProfessorWorkspace currentPath="/project-approvals" role={actor.role} eyebrow={request.programName} title="프로젝트 승인 요청 상세" description="제안 내용, 지원 조건과 전체 일정을 확인합니다." actions={backLink}>{detail}</ProfessorWorkspace></AppShell>;
  }
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/project-approvals"><main className="content-shell page-enter space-y-8"><PageHeader eyebrow={request.programName} title="프로젝트 승인 요청 상세" description="보낸 제안 내용과 검토 결과를 확인합니다." actions={backLink} />{detail}</main></AppShell>;
}
