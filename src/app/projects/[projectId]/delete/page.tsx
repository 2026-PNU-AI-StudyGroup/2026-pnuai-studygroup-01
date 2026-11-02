import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectDeleteForm } from "@/app/projects/[projectId]/_components/project-delete-form";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { loadTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 삭제");
}

// 관리자가 결과물을 확인한 자리에서 바로 프로젝트를 지울 수 있게 진행 현황 안에 둔다.
export default async function ProjectDeletePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(projectId);
  if (actor.role !== "ADMIN") redirect(`/projects/${projectId}`);

  // 지우면 함께 사라지는 기록을 실제 수로 보여 준다. 0 도 0 으로 적는다.
  const [reportVersions, artifacts] = await Promise.all([
    prisma.reportVersion.count({ where: { report: { projectTeamId: workspace.id } } }),
    prisma.artifact.count({ where: { projectTeamId: workspace.id } }),
  ]);
  const records = [
    { label: "팀원", value: workspace.memberCount, unit: "명" },
    { label: "할 일", value: workspace.taskCount, unit: "개" },
    { label: "팀 대화 메시지", value: workspace.discussionTotal, unit: "개" },
    { label: "보고서 제출본", value: reportVersions, unit: "개" },
    { label: "결과물", value: artifacts, unit: "건" },
  ];

  return (
    <section aria-labelledby="project-delete-page-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        meta={<UiText>{workspace.programName}</UiText>}
        title="프로젝트 삭제"
        titleId="project-delete-page-title"
        finding={<UiText>{`${workspace.topicTitle} 프로젝트를 지우면 아래 기록이 함께 사라지고 되돌릴 수 없습니다.`}</UiText>}
      />
      <div className="grid items-start gap-3.5 md:grid-cols-[20rem_minmax(0,1fr)]">
        <section aria-labelledby="project-delete-records-title" className={cardClass}>
          <CardHead id="project-delete-records-title" title={<UiText>{"함께 삭제되는 기록"}</UiText>} />
          <dl className="text-[0.8125rem]">
            {records.map((record) => (
              <div key={record.label} className="flex min-h-10 items-center justify-between gap-3 border-t border-[var(--line)] px-5">
                <dt className="text-[var(--ink)]"><UiText>{record.label}</UiText></dt>
                <dd className="tabular-nums text-[var(--ink)]">{record.value.toLocaleString("ko-KR")}<span className="ml-0.5 text-[var(--muted)]"><UiText>{record.unit}</UiText></span></dd>
              </div>
            ))}
          </dl>
        </section>
        <ProjectDeleteForm topicId={workspace.topicId} title={workspace.topicTitle} />
      </div>
    </section>
  );
}
