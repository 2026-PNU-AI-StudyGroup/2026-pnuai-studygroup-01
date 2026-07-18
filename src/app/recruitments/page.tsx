import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RecruitmentApplyForm } from "@/app/recruitments/recruitment-forms";
import { RecruitmentPageIntro, RecruitmentPagination, RecruitmentSectionLayout } from "@/app/recruitments/recruitment-section-layout";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
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
  const pageHref = (page: number) => page > 1 ? `/recruitments?page=${page}` : "/recruitments";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments">
      <main className="content-shell">
        <RecruitmentSectionLayout currentPath="/recruitments">
          <div className="space-y-8">
            <RecruitmentPageIntro
              label="함께할 사람 찾기"
              title="팀원 모집"
              description="프로젝트 이름보다 실제로 맡을 역할과 함께할 시간을 먼저 비교해 보세요. 지원서는 현재 화면을 벗어나지 않는 대화상자에서 작성합니다."
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--ink)]">지원 가능한 모집</h2>
              <p className="muted text-sm">전체 {data.total}개</p>
            </div>

            {data.posts.length === 0 ? (
              <EmptyState title="열린 모집 글이 없습니다" description="지원 가능한 모집 글이 생기면 이곳에 표시됩니다." />
            ) : (
              <ol className="border-y-2 border-[var(--line-strong)]">
                {data.posts.map((post) => (
                  <li key={post.id} className="border-b-2 border-[var(--line-strong)] last:border-b-0">
                    <article className="recruitment-row grid gap-7 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_12.5rem] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                          <span className="font-extrabold text-[var(--primary)]">{post.teamName}</span>
                          <span className="muted">{post.topicTitle}</span>
                          <span className="muted">모집자 {post.authorName}</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-black leading-snug tracking-[-0.035em] text-[var(--ink)]">{post.title}</h3>
                        <TranslatedText text={post.content} className="muted mt-3 max-w-3xl leading-7" />

                        <dl className="mt-6 grid gap-x-8 gap-y-4 border-l-2 border-[var(--line)] pl-5 text-sm sm:grid-cols-3">
                          <div>
                            <dt className="muted text-xs font-semibold">필요 기술</dt>
                            <dd className="mt-1 font-bold text-[var(--ink)]">{post.requiredSkills.join(", ")}</dd>
                          </div>
                          <div>
                            <dt className="muted text-xs font-semibold">맡을 역할</dt>
                            <dd className="mt-1 font-bold text-[var(--ink)]">{post.roleNeeded}</dd>
                          </div>
                          <div>
                            <dt className="muted text-xs font-semibold">활동 가능 시간</dt>
                            <dd className="mt-1 font-bold text-[var(--ink)]">{post.availability}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="border-t border-[var(--line)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <p className="text-sm font-bold text-[var(--ink)]">현재 팀원</p>
                        <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">
                          {post.memberCount}<span className="muted ml-1 text-sm font-semibold">/ {post.capacity}명</span>
                        </p>
                        {post.authorId !== actor.id && post.canApply && !post.ownApplication ? (
                          <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} profile={profile} />
                        ) : post.ownApplication ? (
                          <div className="mt-5">
                            <p className="muted mb-2 text-xs font-semibold">내 지원 상태</p>
                            <StatusBadge tone={historyStatus[post.ownApplication.status].tone}>{historyStatus[post.ownApplication.status].label}</StatusBadge>
                          </div>
                        ) : post.authorId === actor.id ? (
                          <p className="muted mt-5 text-sm leading-6">내가 등록한 모집 글입니다.</p>
                        ) : (
                          <p className="muted mt-5 text-sm leading-6">현재 지원할 수 없습니다.</p>
                        )}
                      </div>
                    </article>
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
