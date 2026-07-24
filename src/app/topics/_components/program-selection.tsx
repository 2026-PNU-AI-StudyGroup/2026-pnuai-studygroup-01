import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import { ProgramFilterCards } from "@/app/topics/_components/program-filter-cards";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

export function ProgramSelection({ programs, programId, phase, query, sort }: {
  programs: ProjectProgramRecord[];
  programId?: string;
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
}) {
  return (
    <ProgramFilterCards
      allHref={activeProjectsHref({ phase, query, sort })}
      selectedId={programId}
      options={programs.map((program) => ({
        id: program.id,
        name: program.name,
        category: program.category,
        href: activeProjectsHref({ phase, programId: program.id, query, sort }),
      }))}
    />
  );
}
