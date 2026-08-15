import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listAssignedProjects } from "@/modules/advisor/infrastructure/prisma-advisor-workspace-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("담당 프로젝트");
}


export default async function AdvisorAssignmentsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const projects = await listAssignedProjects(prisma, actor.id);

  return (
    <main className="content-shell page-enter">
    <section aria-labelledby="advisor-assignments-title" className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 id="advisor-assignments-title" className="text-[clamp(1.375rem,2.2vw,1.75rem)] font-bold leading-[1.2] tracking-[-0.035em]">
          <UiText>{"담당 프로젝트"}</UiText>
        </h1>
        <p className="muted mt-2 max-w-xl text-sm leading-6"><UiText>{"자문위원으로 배정된 프로젝트 목록입니다."}</UiText></p>
      </header>

      {projects.length === 0 ? (
        <EmptyState title="할당된 프로젝트가 없습니다" description="관리자가 담당 프로젝트를 배정하면 이곳에 표시됩니다." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/advisor/${topic.id}`}
                className="block h-full rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]"><UiText>{topic.program.name}</UiText></p>
                <h2 className="mt-1.5 text-base font-bold leading-6 tracking-[-0.02em] [overflow-wrap:anywhere]"><UiText>{topic.title}</UiText></h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {topic.team ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]"><UiText>{topic.team.name}</UiText></span>
                      <span className="inline-flex items-center rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        <UiText>{topic.team.confirmedAt ? "팀 확정" : "팀 구성 중"}</UiText>
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--muted)]"><UiText>{"팀 미구성"}</UiText></span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
    </main>
  );
}
