import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RecruitmentPostList } from "@/app/recruitments/_components/recruitment-post-list";
import { RecruitmentHero, RecruitmentPagination, RecruitmentSectionLayout } from "@/app/recruitments/_components/recruitment-section-layout";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "팀원 모집" };

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
      <main className="content-shell page-enter">
        <RecruitmentHero />
        <div className="mt-8">
          <RecruitmentSectionLayout currentPath="/recruitments">
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black tracking-[-0.035em] text-[var(--ink)]">지원 가능한 모집</h2>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-sm font-bold text-[var(--muted)]">전체 {data.total}개</span>
                </div>
                <p className="muted text-sm">등록된 역할과 협업 조건을 확인해 보세요</p>
              </div>

              <RecruitmentPostList actorId={actor.id} data={data} profile={profile} />

              <RecruitmentPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
            </div>
          </RecruitmentSectionLayout>
        </div>
      </main>
    </AppShell>
  );
}
