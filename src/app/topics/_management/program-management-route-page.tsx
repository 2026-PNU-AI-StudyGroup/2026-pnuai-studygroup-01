import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { buildAdminProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import {
  ProgramCreateWorkspace,
  ProgramManagementWorkspace,
} from "@/app/topics/_management/program-management-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import {
  parseProgramManagementTab,
  programCreateHref,
  programManagementHref,
  programManagementTabs,
  type ProgramManagementTab,
} from "@/modules/project-program/ui/program-management-route";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

async function loadProgramManagementContext() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  const programRepository = new PrismaProjectProgramRepository(prisma);
  const [programs, pendingApprovals] = await Promise.all([
    new ProjectProgramService(programRepository).listAll(actor),
    new TopicApprovalService(
      new PrismaTopicApprovalRepository(prisma),
      programRepository,
    ).listAdminPendingCountsByProgram(actor),
  ]);
  const pendingApprovalCounts = new Map(
    pendingApprovals.map(({ programId, count }) => [programId, count]),
  );
  return { actor, programs, pendingApprovalCounts };
}

function defaultProgramId(
  programs: Awaited<ReturnType<ProjectProgramService["listAll"]>>,
  now: Date,
) {
  return programs.find(({ endsAt }) => endsAt > now)?.id ?? programs[0]?.id;
}

function canonicalManagementTab(tabSegments: string[] | undefined): {
  tab: ProgramManagementTab;
  canonical: boolean;
} {
  if (!tabSegments?.length) return { tab: "settings", canonical: true };
  if (tabSegments.length !== 1) return { tab: "settings", canonical: false };
  const [rawTab] = tabSegments;
  const tab = parseProgramManagementTab(rawTab);
  return {
    tab,
    canonical: rawTab === tab && rawTab !== "settings" && programManagementTabs.includes(tab),
  };
}

export async function ProgramManagementRoutePage({
  requestedProgramId,
  tabSegments,
}: {
  requestedProgramId?: string;
  tabSegments?: string[];
}) {
  const { actor, programs, pendingApprovalCounts } = await loadProgramManagementContext();
  const now = new Date();
  const fallbackProgramId = defaultProgramId(programs, now);
  if (!fallbackProgramId) redirect(programCreateHref());

  const selectedProgramId = programs.some(({ id }) => id === requestedProgramId)
    ? requestedProgramId!
    : fallbackProgramId;
  const { tab, canonical } = canonicalManagementTab(tabSegments);
  if (selectedProgramId !== requestedProgramId || !canonical) {
    redirect(programManagementHref(selectedProgramId, tab));
  }

  const sidebarItems = buildAdminProgramSidebarItems(
    programs,
    "manage",
    tab,
    now,
    pendingApprovalCounts,
  );
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={programManagementHref(selectedProgramId, tab)}>
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={selectedProgramId} title="프로그램 관리" showSettings />}>
        <ProgramManagementWorkspace
          actor={actor}
          programId={selectedProgramId}
          tab={tab}
          pendingApprovalCount={pendingApprovalCounts.get(selectedProgramId) ?? 0}
        />
      </ExplorerLayout>
    </AppShell>
  );
}

export async function ProgramCreateRoutePage() {
  const { actor, programs, pendingApprovalCounts } = await loadProgramManagementContext();
  const now = new Date();
  const fallbackProgramId = defaultProgramId(programs, now);
  const sidebarItems = buildAdminProgramSidebarItems(
    programs,
    "create",
    "settings",
    now,
    pendingApprovalCounts,
  );
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={programCreateHref()}>
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} title="프로그램 관리" showSettings />}>
        <ProgramCreateWorkspace cancelHref={fallbackProgramId ? programManagementHref(fallbackProgramId) : "/topics"} />
      </ExplorerLayout>
    </AppShell>
  );
}
