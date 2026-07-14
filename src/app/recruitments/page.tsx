import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentApplyForm, RecruitmentDecisionForm, RecruitmentPostForm } from "@/app/recruitments/recruitment-forms";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export default async function RecruitmentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/");
  const data = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).list(actor, Number((await searchParams).page ?? "1"));

  return <AppShell role={actor.role} userName="부산대학교" currentPath="/recruitments">
    <main className="content-shell space-y-10">
      <PageHeader eyebrow="Team up" title="팀원 모집" description="구성 중인 팀의 필요한 역할을 알리고 함께할 학생을 찾으세요." />
      <RecruitmentPostForm teams={data.formingTeams} />
      {data.posts.length === 0 ? <EmptyState title="열린 모집 글이 없습니다" description="구성 중인 팀원이 모집 글을 등록하면 이곳에 표시됩니다." /> : <>
        <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{data.posts.map((post) => <li key={post.id} className="py-8">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge>{post.teamName} · {post.memberCount}/{post.capacity}명</StatusBadge><span className="muted text-sm">{post.topicTitle} · {post.authorName}</span></div>
          <h2 className="mt-4 text-xl font-bold">{post.title}</h2>
          <TranslatedText text={post.content} className="muted mt-3 leading-7" />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="muted text-xs">필요 기술</dt><dd>{post.requiredSkills.join(", ")}</dd></div><div><dt className="muted text-xs">필요 역할</dt><dd>{post.roleNeeded}</dd></div><div><dt className="muted text-xs">활동 시간</dt><dd>{post.availability}</dd></div></dl>
          {post.authorId !== actor.id && post.canApply && !post.ownApplication ? <RecruitmentApplyForm postId={post.id} /> : post.ownApplication ? <p className="mt-4 text-sm font-semibold">지원 상태 · {post.ownApplication.status}</p> : null}
          {post.authorId === actor.id && post.receivedApplications.length ? <ul className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)]">{post.receivedApplications.map((application) => <li key={application.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
            <div><p className="font-semibold">{application.studentName} · {application.skills.join(", ")}</p><p className="muted text-sm">{application.desiredRole} · {application.availability}</p><TranslatedText text={application.message} className="mt-2 text-sm" /></div>
            {application.status === "PENDING" ? <div className="flex gap-2"><RecruitmentDecisionForm applicationId={application.id} decision="ACCEPT" /><RecruitmentDecisionForm applicationId={application.id} decision="REJECT" /></div> : <StatusBadge>{application.status}</StatusBadge>}
          </li>)}</ul> : null}
        </li>)}</ol>
        <nav aria-label="모집 글 페이지" className="flex items-center justify-between"><span className="muted text-sm">{data.page} / {data.totalPages} 페이지 · 총 {data.total}개</span><div className="flex gap-2">{data.page > 1 ? <Link className="button-quiet" href={`/recruitments?page=${data.page - 1}`}>이전</Link> : null}{data.page < data.totalPages ? <Link className="button-quiet" href={`/recruitments?page=${data.page + 1}`}>다음</Link> : null}</div></nav>
      </>}
    </main>
  </AppShell>;
}
