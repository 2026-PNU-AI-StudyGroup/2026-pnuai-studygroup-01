import Link from "next/link";
import { redirect } from "next/navigation";

import { TopicForm } from "@/app/professor/topics/topic-form";
import { TopicStatusButton } from "@/app/professor/topics/topic-status-button";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListOwnTopicsService } from "@/modules/topic/application/list-own-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ProfessorTopicsPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") {
    redirect("/");
  }

  const cycleRepository = new PrismaAcademicCycleRepository(prisma);
  const topicRepository = new PrismaTopicRepository(prisma);
  const [cycles, topics] = await Promise.all([
    new ListAcademicCyclesService(cycleRepository).execute(),
    new ListOwnTopicsService(topicRepository).execute(actor),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-10 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">교수</p>
          <h1 className="mt-2 text-3xl font-bold">주제 관리</h1>
        </div>
        <Link href="/professor/applications" className="text-sm font-semibold text-blue-700">
          받은 지원서
        </Link>
      </header>
      {cycles.length === 0 ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          관리자가 학기를 먼저 등록해야 주제를 만들 수 있습니다.
        </p>
      ) : null}
      <TopicForm cycles={cycles} />
      <section aria-labelledby="topic-list-title">
        <h2 id="topic-list-title" className="text-xl font-semibold">내 주제</h2>
        {topics.length === 0 ? (
          <p className="mt-3 text-zinc-600">등록한 주제가 없습니다.</p>
        ) : (
          <ul className="mt-3 grid gap-4">
            {topics.map((topic) => (
              <li key={topic.id} className="rounded-xl border p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold">{topic.title}</h3>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">{topic.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{topic.description}</p>
                <p className="mt-3 text-sm">모집 인원 {topic.capacity}명</p>
                <TopicStatusButton topicId={topic.id} status={topic.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
