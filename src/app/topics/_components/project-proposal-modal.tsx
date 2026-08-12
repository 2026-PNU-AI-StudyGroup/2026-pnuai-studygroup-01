"use client";

import { createTopicAction } from "@/app/_actions/create-topic-action";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { TopicForm } from "@/modules/topic/ui/topic-form";

export function ProjectProposalModal({ programs, defaultProgramId, professors, studentTeams, closeHref }: {
  programs: ProjectProgramRecord[];
  defaultProgramId?: string;
  professors: Array<{ id: string; name: string; email: string }>;
  studentTeams: Array<{ id: string; name: string; memberCount: number }>;
  closeHref: string;
}) {
  return (
    <TeamModal title="프로젝트 제안" closeHref={closeHref} size="wizard">
      <TopicForm
        action={createTopicAction}
        programs={programs}
        defaultProgramId={defaultProgramId}
        studentApproval={{ professors, studentTeams }}
        wizard={{ closeHref }}
      />
    </TeamModal>
  );
}
