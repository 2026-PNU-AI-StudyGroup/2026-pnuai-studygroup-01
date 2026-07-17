import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentSectionLayout } from "@/app/recruitments/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "내 모집 글" };

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

export default async function MyRecruitmentPostsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).listAuthoredPosts(actor, requestedPage);
  const pageHref = (page: number) => page > 1 ? `/recruitments/mine?page=${page}` : "/recruitments/mine";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/mine">
      <main className="content-shell">
        <RecruitmentSectionLayout currentPath="/recruitments/mine"><div className="space-y-10">
          <PageHeader eyebrow="모집 관리" title="내 모집 글" description="내가 작성한 모집 글과 들어온 지원 수를 확인하고, 글별 지원자를 별도 화면에서 검토합니다." actions={<Link className="button-primary" href="/recruitments/new">모집 글 등록</Link>} />
          {data.posts.length === 0 ? <EmptyState title="작성한 모집 글이 없습니다" description="구성 중인 팀에 필요한 역할을 정리해 첫 모집 글을 등록해 보세요." action={<Link className="button-primary" href="/recruitments/new">모집 글 등록</Link>} /> : <>
            <ol className="border-b border-[var(--line)]">{data.posts.map((post) => <li key={post.id} className="grid gap-5 border-t border-[var(--line)] py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3"><StatusBadge tone={post.status === "OPEN" ? "success" : undefined}>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</StatusBadge><span className="muted text-sm">{post.topicTitle} · {post.teamName}</span></div>
                <h2 className="mt-3 text-xl font-extrabold tracking-[-0.025em]">{post.title}</h2>
                <p className="muted mt-2 text-sm">지원 {post.applicationCount}명 · 검토 대기 {post.pendingApplicationCount}명 · 팀원 {post.memberCount}/{post.capacity}명 · {koreanDate.format(post.createdAt)} 작성</p>
              </div>
              <Link className={post.pendingApplicationCount ? "button-primary" : "button-secondary"} href={`/recruitments/${post.id}/applications`}>지원자 검토</Link>
            </li>)}</ol>
            {data.totalPages > 1 ? <nav aria-label="내 모집 글 페이지" className="flex items-center justify-between gap-4"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지 · 총 {data.total}개</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={pageHref(data.page - 1)}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={pageHref(data.page + 1)}>다음</Link> : null}</div></nav> : null}
          </>}
        </div></RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
