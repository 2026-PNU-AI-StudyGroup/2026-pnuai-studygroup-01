import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentApplyForm } from "@/app/recruitments/recruitment-forms";
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
        <PageHeader eyebrow="팀 구성" title="팀원 모집" description="현재 지원할 수 있는 모집 글의 역할과 활동 조건을 비교하고 함께할 팀을 찾으세요." />
        {data.posts.length === 0 ? <EmptyState title="열린 모집 글이 없습니다" description="지원 가능한 모집 글이 생기면 이곳에 표시됩니다." /> : <>
        <ol className="border-b border-[var(--line)]">{data.posts.map((post) => <li key={post.id} className="border-t border-[var(--line)] py-9">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge>{post.teamName} · {post.memberCount}/{post.capacity}명</StatusBadge><span className="muted text-sm">{post.topicTitle} · {post.authorName}</span></div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em]">{post.title}</h2>
          <TranslatedText text={post.content} className="muted mt-3 max-w-3xl leading-7" />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="muted text-xs">필요 기술</dt><dd>{post.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs">필요 역할</dt><dd>{post.roleNeeded}</dd></div><div><dt className="muted text-xs">활동 가능 시간</dt><dd>{post.availability}</dd></div></dl>
          {post.authorId !== actor.id && post.canApply && !post.ownApplication ? <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} profile={profile} /> : post.ownApplication ? <div className="mt-4 flex items-center gap-2 text-sm font-semibold"><span>지원 상태</span><StatusBadge tone={historyStatus[post.ownApplication.status].tone}>{historyStatus[post.ownApplication.status].label}</StatusBadge></div> : null}
        </li>)}</ol>
          <nav aria-label="모집 글 페이지" className="flex flex-wrap items-center justify-between gap-3"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지 · 총 {data.total}개</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={pageHref(data.page - 1)}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={pageHref(data.page + 1)}>다음</Link> : null}</div></nav>
        </>}
      </div></RecruitmentSectionLayout>
    </main>
  </AppShell>;
}
