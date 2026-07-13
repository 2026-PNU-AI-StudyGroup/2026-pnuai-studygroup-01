import Link from "next/link";
import { redirect } from "next/navigation";

import { DecisionButtons } from "@/app/professor/applications/decision-buttons";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const statusLabel = {
  PENDING: "검토 중",
  ACCEPTED: "수락",
  REJECTED: "거절",
} as const;

export default async function ProfessorApplicationsPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") {
    redirect("/");
  }

  const applications = await new ListReceivedTopicApplicationsService(
    new PrismaTopicApplicationRepository(prisma),
  ).execute(actor);

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">교수</p>
          <h1 className="mt-2 text-3xl font-bold">받은 주제 지원서</h1>
        </div>
        <Link href="/professor/topics" className="text-sm font-semibold text-blue-700">
          주제 관리
        </Link>
      </header>
      {applications.length === 0 ? (
        <p className="text-zinc-600">받은 지원서가 없습니다.</p>
      ) : (
        <ul className="grid gap-5">
          {applications.map((application) => (
            <li key={application.id} className="rounded-xl border p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-600">{application.topicTitle}</p>
                  <h2 className="mt-1 text-lg font-semibold">{application.studentName}</h2>
                  <p className="text-sm text-zinc-600">{application.studentEmail}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">
                  {statusLabel[application.status]}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-zinc-700">{application.message}</p>
              {application.status === "PENDING" ? (
                <DecisionButtons applicationId={application.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
