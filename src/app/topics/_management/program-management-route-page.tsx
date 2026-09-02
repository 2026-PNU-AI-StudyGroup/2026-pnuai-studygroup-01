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
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import {
  resolveProgramManagementTab,
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
  legacy: "tracks" | null;
} {
  if (!tabSegments?.length) return { tab: "settings", canonical: true, legacy: null };
  if (tabSegments.length !== 1) return { tab: "settings", canonical: false, legacy: null };
  const [rawTab] = tabSegments;
  const { tab, legacy } = resolveProgramManagementTab(rawTab);
  return {
    tab,
    canonical: legacy === null && rawTab === tab && rawTab !== "settings" && programManagementTabs.includes(tab),
    legacy,
  };
}

export async function ProgramManagementRoutePage({
  requestedProgramId,
  tabSegments,
  targetMode,
}: {
  requestedProgramId?: string;
  tabSegments?: string[];
  targetMode?: string;
}) {
  const { actor, programs, pendingApprovalCounts } = await loadProgramManagementContext();
  const now = new Date();
  const fallbackProgramId = defaultProgramId(programs, now);
  if (!fallbackProgramId) redirect(programCreateHref());

  const selectedProgramId = programs.some(({ id }) => id === requestedProgramId)
    ? requestedProgramId!
    : fallbackProgramId;
  const { tab, canonical, legacy } = canonicalManagementTab(tabSegments);
  if (selectedProgramId !== requestedProgramId || !canonical) {
    redirect(`${programManagementHref(selectedProgramId, tab)}${legacy === "tracks" ? "#divisions" : ""}`);
  }

  const sidebarItems = buildAdminProgramSidebarItems(
    programs,
    now,
    pendingApprovalCounts,
  );
  const categoryOrder = await listProgramCategoryOrder(prisma);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={programManagementHref(selectedProgramId, tab)}>
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={selectedProgramId} title="프로그램 관리" showSettings selectedItemLinkable categoryOrder={categoryOrder} />}>
        <ProgramManagementWorkspace
          actor={actor}
          programId={selectedProgramId}
          tab={tab}
          targetMode={targetMode === "DIRECT" ? "DIRECT" : "CURRENT"}
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
    now,
    pendingApprovalCounts,
  );
  const categoryOrder = await listProgramCategoryOrder(prisma);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={programCreateHref()}>
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} title="프로그램 관리" showSettings categoryOrder={categoryOrder} />}>
        <ProgramCreateWorkspace cancelHref={fallbackProgramId ? programManagementHref(fallbackProgramId) : "/topics"} />
      </ExplorerLayout>
    </AppShell>
  );
}
