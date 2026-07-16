import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DecisionButtons } from "@/app/professor/applications/decision-buttons";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "지원 검토" };

const statusPresentation = { PENDING: ["검토 중", "info"], ACCEPTED: ["수락", "success"], REJECTED: ["거절", "danger"] } as const;

export default async function ProfessorApplicationsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/");
  const applications = await new ListReceivedTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor);

  return (
    <AppShell role={actor.role} userName={actor.name} currentPath="/professor/applications">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="교수 작업" title="지원 검토" description="학생의 지원 동기, 보유 기술, 희망 역할과 활동 가능 시간을 확인하고 팀 참여 여부를 결정하세요." actions={<Link href="/professor/topics" className="button-secondary">주제 관리</Link>} />
        {applications.length === 0 ? <EmptyState title="받은 지원서가 없습니다" description="학생이 공개 주제에 지원하면 이곳에 지원서가 표시됩니다." /> : (
          <section aria-label="지원서 목록">
            <div className="flex items-center gap-4 border-y border-[var(--line)] py-4 text-sm"><StatusBadge tone="info">검토 대기 {applications.filter((item) => item.status === "PENDING").length}</StatusBadge><span className="muted">전체 {applications.length}</span></div>
            <ul className="divide-y divide-[var(--line)]">
              {applications.map((application) => <li key={application.id} className="grid gap-6 py-9 lg:grid-cols-[13rem_minmax(0,1fr)_10rem]"><div><p className="text-xl font-extrabold tracking-[-0.025em]">{application.studentName}</p><p className="muted mt-1 break-all text-sm">{application.studentEmail}</p><div className="mt-3"><StatusBadge tone={statusPresentation[application.status][1]}>{statusPresentation[application.status][0]}</StatusBadge></div></div><div><p className="text-xs font-bold text-[var(--accent)]">지원 주제</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">{application.topicTitle}</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="muted text-xs">보유 기술</dt><dd className="mt-1 font-semibold">{application.skills.join(", ") || "기존 지원서 미입력"}</dd></div><div><dt className="muted text-xs">희망 역할</dt><dd className="mt-1">{application.desiredRole || "기존 지원서 미입력"}</dd></div><div><dt className="muted text-xs">활동 가능 시간</dt><dd className="mt-1">{application.availability || "기존 지원서 미입력"}</dd></div></dl><TranslatedText text={application.message} className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]" /></div><div className="lg:text-right">{application.status === "PENDING" ? <DecisionButtons applicationId={application.id} /> : null}</div></li>)}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
