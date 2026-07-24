import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentPageIntro, RecruitmentPagination, RecruitmentSectionLayout } from "@/app/recruitments/_components/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "작성한 모집" };

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
        <RecruitmentSectionLayout currentPath="/recruitments/mine">
          <div className="space-y-8">
            <RecruitmentPageIntro
              label="내 모집 · 지원"
              title="작성한 모집"
              description="내가 연 모집의 팀 충원 상태와 검토 대기 인원을 한 줄에서 확인하고, 지원자 검토는 별도 화면에서 진행합니다."
              action={<Link className="button-primary" href="/recruitments/new">모집 글 등록</Link>}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--ink)]">모집 글</h2>
              <p className="muted text-sm">전체 {data.total}개</p>
            </div>

            {data.posts.length === 0 ? (
              <EmptyState title="작성한 모집 글이 없습니다" description="구성 중인 팀에 필요한 역할을 정리해 첫 모집 글을 등록해 보세요." action={<Link className="button-primary" href="/recruitments/new">모집 글 등록</Link>} />
            ) : (
              <ol className="border-y border-[var(--line)]">
                {data.posts.map((post) => (
                  <li key={post.id} className="grid gap-5 border-b border-[var(--line)] py-6 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge tone={post.status === "OPEN" ? "success" : undefined}>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</StatusBadge>
                        <span className="muted text-sm">{post.topicTitle} · {post.teamName}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-black tracking-[-0.025em] text-[var(--ink)]">{post.title}</h3>
                      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <div className="flex gap-2"><dt className="muted">지원</dt><dd className="font-extrabold">{post.applicationCount}명</dd></div>
                        <div className="flex gap-2"><dt className="muted">검토 대기</dt><dd className={post.pendingApplicationCount ? "font-extrabold text-[var(--primary)]" : "font-extrabold"}>{post.pendingApplicationCount}명</dd></div>
                        <div className="flex gap-2"><dt className="muted">팀원</dt><dd className="font-extrabold">{post.memberCount}/{post.capacity}명</dd></div>
                        <div className="flex gap-2"><dt className="muted">작성</dt><dd>{koreanDate.format(post.createdAt)}</dd></div>
                      </dl>
                    </div>
                    <Link className={post.pendingApplicationCount ? "button-primary" : "button-secondary"} href={`/recruitments/${post.id}/applications`}>
                      {post.pendingApplicationCount ? `${post.pendingApplicationCount}명 검토` : "지원자 보기"}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <RecruitmentPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
          </div>
        </RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
