import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RecruitmentDecisionForm } from "@/app/recruitments/recruitment-forms";
import { RecruitmentSectionLayout } from "@/app/recruitments/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "모집 지원자 검토" };

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const statusPresentation = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

export default async function RecruitmentPostApplicationsPage({ params }: { params: Promise<{ postId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT" && actor.role !== "ADMIN") redirect("/topics");
  const { postId } = await params;
  const post = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).getPostApplications(actor, postId);
  if (!post) notFound();
  const content = <div className="space-y-10">
    <PageHeader eyebrow="지원자 검토" title={post.title} description={`${post.topicTitle} · ${post.teamName}`} actions={<Link className="button-quiet" href={actor.role === "STUDENT" ? "/recruitments/mine" : "/dashboard"}>목록으로</Link>} />
    <section aria-labelledby="recruitment-content-title" className="border-y border-[var(--line)] py-6">
      <h2 id="recruitment-content-title" className="text-sm font-extrabold">모집 내용</h2>
      <TranslatedText text={post.content} className="muted mt-3 max-w-3xl leading-7" />
    </section>
    <section aria-labelledby="applicant-list-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4"><h2 id="applicant-list-title" className="text-xl font-extrabold">지원자 {post.applications.length}명</h2><StatusBadge tone={post.status === "OPEN" ? "success" : undefined}>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</StatusBadge></div>
      {post.applications.length === 0 ? <EmptyState title="아직 지원자가 없습니다" description="지원이 들어오면 지원자의 기술, 희망 역할, 활동 가능 시간을 이곳에서 검토할 수 있습니다." /> : <ol className="border-b border-[var(--line)]">{post.applications.map((application) => <li key={application.id} className="grid gap-5 border-t border-[var(--line)] py-7 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h3 className="font-extrabold">{application.studentName}</h3><StatusBadge tone={statusPresentation[application.status].tone}>{statusPresentation[application.status].label}</StatusBadge><span className="muted text-xs">{koreanDate.format(application.createdAt)} 지원</span></div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="muted text-xs">보유 기술</dt><dd>{application.skills.join(", ")}</dd></div><div><dt className="muted text-xs">희망 역할</dt><dd>{application.desiredRole}</dd></div><div><dt className="muted text-xs">활동 가능 시간</dt><dd>{application.availability}</dd></div></dl>
          <TranslatedText text={application.message} className="mt-4 text-sm leading-6" />
        </div>
        {application.status === "PENDING" && post.status === "OPEN" ? <div className="flex items-start gap-2"><RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="ACCEPT" /><RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="REJECT" /></div> : null}
      </li>)}</ol>}
    </section>
  </div>;

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={actor.role === "STUDENT" ? "/recruitments/mine" : "/dashboard"}>
    <main className="content-shell">{actor.role === "STUDENT" ? <RecruitmentSectionLayout currentPath="/recruitments/mine">{content}</RecruitmentSectionLayout> : content}</main>
  </AppShell>;
}
