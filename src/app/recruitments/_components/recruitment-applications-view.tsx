import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { RecruitmentDecisionForm } from "@/app/recruitments/_components/recruitment-decision-form";
import {
  StudentTeamIcon,
  StudentTeamPageIntro,
} from "@/modules/student-team/ui/student-team-section-layout";
import type { StudentTeamRecruitmentPostApplications } from "@/modules/student-team/application/manage-student-team-recruitment";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";
const statusPresentation = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
  CLOSED: { label: "모집 종료", tone: "neutral" },
  WITHDRAWN: { label: "철회", tone: "neutral" },
} as const;

export function RecruitmentApplicationsView({
  post,
  actorRole,
}: {
  post: StudentTeamRecruitmentPostApplications;
  actorRole: "STUDENT" | "ADMIN";
}) {
  const pendingCount = post.applications.filter((application) => application.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <StudentTeamPageIntro
        title={post.title}
        meta={<><span><UiText>{post.topicTitle}</UiText></span><span aria-hidden="true">·</span><strong className="text-[var(--ink)]">{post.teamName}</strong></>}
        action={
          <Link className="button-quiet gap-2" href={actorRole === "STUDENT" ? "/recruitments/received" : "/dashboard"}>
            <StudentTeamIcon name="chevron-left" className="size-4" />
            <UiText>{"목록"}</UiText></Link>
        }
      />
      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
        <section aria-labelledby="recruitment-content-title" className="grid gap-6 border-b border-[var(--line)] px-7 py-7 lg:grid-cols-[12rem_minmax(0,1fr)] lg:px-9">
          <div>
            <div className="flex items-center gap-3">
              <h2 id="recruitment-content-title" className="text-base font-bold text-[var(--ink)]"><UiText>{"모집 내용"}</UiText></h2>
              <StatusBadge tone={post.status === "OPEN" ? "success" : undefined}><UiText>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</UiText></StatusBadge>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]"><UiText>{"지원자"}</UiText>{" "}{post.applications.length}<UiText>{"명 · 대기"}</UiText>{" "}{pendingCount}<UiText>{"명"}</UiText></p>
          </div>
          <TranslatedText text={post.content} className="max-w-3xl text-sm leading-7 text-[var(--muted)]" />
        </section>

        <section aria-labelledby="applicant-list-title">
          <div className="border-b border-[var(--line)] bg-[var(--surface-subtle)] px-7 py-4 lg:px-9">
            <h2 id="applicant-list-title" className="text-sm font-bold text-[var(--ink)]"><UiText>{"지원자"}</UiText></h2>
          </div>
          {post.applications.length === 0 ? (
            <div className="px-7 lg:px-9">
              <EmptyState variant="section" title="아직 지원자가 없습니다" description="새 지원자가 생기면 이 목록에 표시됩니다." />
            </div>
          ) : (
            <ol>
              {post.applications.map((application) => (
                <li key={application.id} className="border-b border-[var(--line)] px-7 py-7 last:border-b-0 lg:px-9">
                  <article className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--ink)]">{application.studentName}</h3>
                        <StatusBadge tone={statusPresentation[application.status].tone}><UiText>{statusPresentation[application.status].label}</UiText></StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]"><UiDate value={application.createdAt} mode="date" /> {" "}<UiText>{"지원"}</UiText></p>
                    </div>
                    <div className="min-w-0">
                      <dl className="grid gap-5 text-sm">
                        <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"희망 역할"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{application.desiredRole}</UiText></dd></div>
                      </dl>
                      <div className="mt-5 border-t border-[var(--line)] pt-4">
                        <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"지원 내용"}</UiText></p>
                        <TranslatedText text={application.message} className="mt-1 text-sm leading-6" />
                      </div>
                    </div>
                    {application.status === "PENDING" && post.status === "OPEN" ? (
                      <div className="flex items-start gap-2 lg:border-l lg:border-[var(--line)] lg:pl-5">
                        <RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="ACCEPT" />
                        <RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="REJECT" />
                      </div>
                    ) : null}
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
