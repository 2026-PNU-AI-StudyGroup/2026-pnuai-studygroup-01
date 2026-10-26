import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProgramManagementRoutePage } from "@/app/topics/_management/program-management-route-page";
import { PROGRAM_MANAGEMENT_TABS } from "@/app/topics/_management/program-management-workspace";
import { resolveProgramManagementTab } from "@/modules/project-program/ui/program-management-route";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-route";
import { getServerTranslator } from "@/modules/translation/infrastructure/request-locale";

// 브라우저 탭이 여러 개 열려 있어도 어느 칸인지 알 수 있게 탭 이름을 앞에 둔다.
export async function generateMetadata({ params }: { params: Promise<{ tab?: string[] }> }): Promise<Metadata> {
  const { tab } = await params;
  const current = resolveProgramManagementTab(tab?.[0]).tab;
  const label = PROGRAM_MANAGEMENT_TABS.find(({ key }) => key === current)?.label ?? "기본 정보";
  const t = await getServerTranslator();
  return { title: `${t(label)} - ${t("프로그램 관리")}` };
}

export default async function ProgramManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; tab?: string[] }>;
  searchParams: Promise<{ targetMode?: string; approvals?: string }>;
}) {
  const { programId, tab } = await params;
  const { targetMode, approvals } = await searchParams;
  if (approvals === "pending") redirect(projectApprovalsHref({ programId, status: "PENDING" }));
  return <ProgramManagementRoutePage
    requestedProgramId={programId}
    tabSegments={tab}
    targetMode={targetMode}
  />;
}
