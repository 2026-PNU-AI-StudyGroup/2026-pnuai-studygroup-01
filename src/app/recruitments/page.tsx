import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentApplyForm, RecruitmentDecisionForm } from "@/app/recruitments/recruitment-forms";
import { RecruitmentSectionLayout } from "@/app/recruitments/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "팀원 모집" };

const historyStatus = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

export default async function RecruitmentsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const [data, profile] = await Promise.all([
    new RecruitmentService(new PrismaRecruitmentRepository(prisma), new PrismaTopicApplicationRepository(prisma)).listPosts(actor, requestedPage),
    new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor),
  ]);
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (page > 1) query.set("page", String(page));
    const suffix = query.size ? `?${query.toString()}` : "";
    return `/recruitments${suffix}`;
  };

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments">
    <main className="content-shell">
      <RecruitmentSectionLayout currentPath="/recruitments"><div className="space-y-10">
        <PageHeader eyebrow="팀 구성" title="팀원 모집" description="구성 중인 프로젝트 팀의 필요한 역할과 활동 조건을 확인하고 함께할 학생을 찾으세요." actions={data.formingTeams.length ? <Link className="button-primary" href="/recruitments/new">모집 글 등록</Link> : undefined} />
        {data.posts.length === 0 ? <EmptyState title="열린 모집 글이 없습니다" description={data.formingTeams.length ? "새 모집 글을 등록해 필요한 팀원을 찾아보세요." : "지원 가능한 모집 글이 생기면 이곳에 표시됩니다."} action={data.formingTeams.length ? <Link className="button-primary" href="/recruitments/new">모집 글 등록</Link> : undefined} /> : <>
        <ol className="border-b border-[var(--line)]">{data.posts.map((post) => <li key={post.id} className="border-t border-[var(--line)] py-9">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge>{post.teamName} · {post.memberCount}/{post.capacity}명</StatusBadge><span className="muted text-sm">{post.topicTitle} · {post.authorName}</span></div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em]">{post.title}</h2>
          <TranslatedText text={post.content} className="muted mt-3 max-w-3xl leading-7" />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="muted text-xs">필요 기술</dt><dd>{post.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs">필요 역할</dt><dd>{post.roleNeeded}</dd></div><div><dt className="muted text-xs">활동 가능 시간</dt><dd>{post.availability}</dd></div></dl>
          {post.authorId !== actor.id && post.canApply && !post.ownApplication ? <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} profile={profile} /> : post.ownApplication ? <div className="mt-4 flex items-center gap-2 text-sm font-semibold"><span>지원 상태</span><StatusBadge tone={historyStatus[post.ownApplication.status].tone}>{historyStatus[post.ownApplication.status].label}</StatusBadge></div> : null}
          {post.authorId === actor.id && post.receivedApplications.length ? <ul className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)]">{post.receivedApplications.map((application) => <li key={application.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
            <div><p className="font-semibold">{application.studentName} · {application.skills.join(", ")}</p><p className="muted text-sm">{application.desiredRole} · {application.availability}</p><TranslatedText text={application.message} className="mt-2 text-sm" /></div>
            {application.status === "PENDING" ? <div className="flex gap-2"><RecruitmentDecisionForm applicationId={application.id} decision="ACCEPT" /><RecruitmentDecisionForm applicationId={application.id} decision="REJECT" /></div> : <StatusBadge tone={historyStatus[application.status].tone}>{historyStatus[application.status].label}</StatusBadge>}
          </li>)}</ul> : null}
        </li>)}</ol>
          <nav aria-label="모집 글 페이지" className="flex flex-wrap items-center justify-between gap-3"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지 · 총 {data.total}개</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={pageHref(data.page - 1)}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={pageHref(data.page + 1)}>다음</Link> : null}</div></nav>
        </>}
      </div></RecruitmentSectionLayout>
    </main>
  </AppShell>;
}
