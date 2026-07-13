import { redirect } from "next/navigation";

import { AcademicCycleForm } from "@/app/admin/academic-cycles/academic-cycle-form";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function AcademicCyclesPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (actor.role !== "ADMIN") {
    redirect("/");
  }

  const repository = new PrismaAcademicCycleRepository(prisma);
  const cycles = await new ListAcademicCyclesService(repository).execute();

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-6 py-12">
      <header>
        <p className="text-sm font-semibold text-blue-700">관리자</p>
        <h1 className="mt-2 text-3xl font-bold">학년도·학기 관리</h1>
      </header>
      <AcademicCycleForm />
      <section aria-labelledby="cycle-list-title">
        <h2 id="cycle-list-title" className="text-xl font-semibold">
          등록된 학기
        </h2>
        {cycles.length === 0 ? (
          <p className="mt-3 text-zinc-600">등록된 학기가 없습니다.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="px-5 py-4">
                {cycle.academicYear}학년도 {cycle.term === "FIRST" ? "1" : "2"}학기
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
