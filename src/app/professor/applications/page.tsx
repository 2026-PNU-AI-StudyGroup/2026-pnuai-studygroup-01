import Link from "next/link";
import { redirect } from "next/navigation";

import { DecisionButtons } from "@/app/professor/applications/decision-buttons";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

const statusPresentation = { PENDING: ["검토 중", "warning"], ACCEPTED: ["수락", "success"], REJECTED: ["거절", "danger"] } as const;

export default async function ProfessorApplicationsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") redirect("/");
  const applications = await new ListReceivedTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor);

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/professor/applications">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="Review" title="지원 검토" description="학생의 지원 동기와 주제를 확인하고 팀 참여 여부를 결정하세요." actions={<Link href="/professor/topics" className="button-secondary">주제 관리</Link>} />
        {applications.length === 0 ? <EmptyState title="받은 지원서가 없습니다" description="학생이 공개 주제에 지원하면 이곳에 지원서가 표시됩니다." /> : (
          <section aria-label="지원서 목록">
            <div className="flex items-center gap-4 border-y border-[var(--line)] py-4 text-sm"><StatusBadge tone="warning">검토 대기 {applications.filter((item) => item.status === "PENDING").length}</StatusBadge><span className="muted">전체 {applications.length}</span></div>
            <ul className="divide-y divide-[var(--line)]">
              {applications.map((application) => <li key={application.id} className="grid gap-5 py-7 lg:grid-cols-[13rem_minmax(0,1fr)_10rem]"><div><p className="font-bold">{application.studentName}</p><p className="muted mt-1 break-all text-sm">{application.studentEmail}</p><div className="mt-3"><StatusBadge tone={statusPresentation[application.status][1]}>{statusPresentation[application.status][0]}</StatusBadge></div></div><div><p className="muted text-xs">지원 주제</p><h2 className="mt-1 font-bold">{application.topicTitle}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{application.message}</p></div><div className="lg:text-right">{application.status === "PENDING" ? <DecisionButtons applicationId={application.id} /> : null}</div></li>)}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
