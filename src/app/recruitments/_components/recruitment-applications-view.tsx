import Link from "next/link";

import { RecruitmentDecisionForm } from "@/app/recruitments/_components/recruitment-decision-form";
import { RecruitmentPageIntro } from "@/app/recruitments/_components/recruitment-section-layout";
import type { RecruitmentPostApplications } from "@/modules/recruitment/application/manage-recruitment";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const statusPresentation = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

export function RecruitmentApplicationsView({
  post,
  actorRole,
}: {
  post: RecruitmentPostApplications;
  actorRole: "STUDENT" | "ADMIN";
}) {
  const pendingCount = post.applications.filter((application) => application.status === "PENDING").length;

  return (
    <div className="space-y-8">
      <RecruitmentPageIntro
        label="지원자 검토"
        title={post.title}
        description={`${post.topicTitle} · ${post.teamName}`}
        action={<Link className="button-secondary" href={actorRole === "STUDENT" ? "/recruitments/mine" : "/dashboard"}>목록으로</Link>}
      />
      <section aria-labelledby="recruitment-content-title" className="grid gap-4 border-b border-[var(--line)] pb-7 md:grid-cols-[10rem_minmax(0,1fr)]">
        <div><h2 id="recruitment-content-title" className="text-sm font-black text-[var(--ink)]">모집 내용</h2><StatusBadge tone={post.status === "OPEN" ? "success" : undefined}>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</StatusBadge></div>
        <TranslatedText text={post.content} className="muted max-w-3xl leading-7" />
      </section>
      <section aria-labelledby="applicant-list-title" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="applicant-list-title" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">지원자 검토</h2><p className="muted mt-1 text-sm">지원자 {post.applications.length}명 · 검토 대기 <strong className="text-[var(--primary)]">{pendingCount}명</strong></p></div>
          <p className="muted max-w-sm text-sm leading-6">기술만 보지 말고 희망 역할과 실제 활동 가능 시간을 함께 확인하세요.</p>
        </div>
        {post.applications.length === 0 ? (
          <EmptyState title="아직 지원자가 없습니다" description="지원이 도착하면 기술과 희망 역할, 함께할 시간을 한눈에 볼 수 있습니다." />
        ) : (
          <ol className="border-y border-[var(--line)]">
            {post.applications.map((application) => (
              <li key={application.id} className="border-b border-[var(--line)] py-7 last:border-b-0">
                <article className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)_auto]">
                  <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-[var(--ink)]">{application.studentName}</h3><StatusBadge tone={statusPresentation[application.status].tone}>{statusPresentation[application.status].label}</StatusBadge></div><p className="muted mt-2 text-xs">{koreanDate.format(application.createdAt)} 지원</p></div>
                  <div className="min-w-0">
                    <dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="muted text-xs font-semibold">보유 기술</dt><dd className="mt-1 font-bold">{application.skills.join(", ")}</dd></div><div><dt className="muted text-xs font-semibold">희망 역할</dt><dd className="mt-1 font-bold">{application.desiredRole}</dd></div><div><dt className="muted text-xs font-semibold">활동 가능 시간</dt><dd className="mt-1 font-bold">{application.availability}</dd></div></dl>
                    <div className="mt-5 border-l-2 border-[var(--line)] pl-4"><p className="muted text-xs font-semibold">지원 메시지</p><TranslatedText text={application.message} className="mt-1 text-sm leading-6" /></div>
                  </div>
                  {application.status === "PENDING" && post.status === "OPEN" ? (
                    <div className="flex items-start gap-2 lg:border-l lg:border-[var(--line)] lg:pl-5"><RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="ACCEPT" /><RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="REJECT" /></div>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
