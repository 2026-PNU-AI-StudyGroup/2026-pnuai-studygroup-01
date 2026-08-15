import Link from "next/link";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ProjectProgramOperationError, ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { listProgramCategories } from "@/app/topics/_management/program-categories";
import { ProgramForm } from "@/app/topics/_management/program-form";
import {
  type ProgramManagementTab,
  programManagementHref,
} from "@/modules/project-program/ui/program-management-route";
import { topicsHref } from "@/app/topics/_lib/topics-query";
import { ProgramReportRequirementForm } from "@/app/topics/_management/program-report-requirement-form";
import { ProgramVoteResults } from "@/app/topics/_management/program-vote-results";
import { ProgramAdvisorPanel } from "@/app/topics/_management/program-advisor-panel";
import { RubricManager, type RubricDivisionRow, type RubricRow } from "@/app/topics/_management/rubric-manager";
import { ProgramBasicInfoPanel, ProgramOperationPanel, ProgramSchedulePanel, ProgramVotingPanel } from "@/app/topics/_management/program-management-forms";
import styles from "@/app/topics/_management/program-management.module.css";
import navStyles from "@/app/topics/_management/program-section-nav.module.css";
import { ProgramSectionNavIcon, type ProgramSectionNavIconName } from "@/app/topics/_management/program-section-nav";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { advisorScoreMatrix, listProgramAdvisors, listProgramTopicsForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-query";
import { AccountIcon } from "@/shared/ui/workspace-icons";

const TABS: Array<{ key: ProgramManagementTab; label: string }> = [
  { key: "settings", label: "기본 정보" },
  { key: "operation", label: "운영 설정" },
  { key: "schedule", label: "일정" },
  { key: "votes", label: "투표" },
  { key: "rubric", label: "채점표" },
  { key: "reports", label: "보고서" },
  { key: "advisors", label: "자문위원" },
];

function ManagementTabIcon({ tab }: { tab: ProgramManagementTab }) {
  if (tab === "advisors") return <AccountIcon />;
  const section: Record<Exclude<ProgramManagementTab, "advisors">, ProgramSectionNavIconName> = {
    settings: "basic",
    operation: "operation",
    schedule: "schedule",
    votes: "voting",
    rubric: "rubric",
    reports: "reports",
  };
  return <ProgramSectionNavIcon section={section[tab]} />;
}

export function ProgramManagementHeader({ program, tab, pendingApprovalCount }: {
  program: { id: string; name: string; isPublic?: boolean; endsAt: Date };
  tab: ProgramManagementTab;
  pendingApprovalCount: number;
}) {
  const status = program.endsAt <= new Date()
    ? { label: "종료", tone: "neutral" as const }
    : program.isPublic
      ? { label: "공개", tone: "info" as const }
      : { label: "비공개", tone: "neutral" as const };
  return (
    <>
      <header className="border-b border-[var(--line)] pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]">
            <UiText>{program.name}</UiText>
          </h1>
          <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
          {pendingApprovalCount > 0 ? (
            <Link
              href={projectApprovalsHref({ programId: program.id, status: "PENDING" })}
              className="inline-flex min-h-8 items-center rounded-full border border-[var(--warning)] bg-[var(--warning-subtle)] px-3 text-xs font-bold text-[var(--warning-ink)] transition-colors hover:bg-white"
            >
              <UiText>{"승인 대기"}</UiText> {pendingApprovalCount}<UiText>{"건 · 검토하기"}</UiText>
            </Link>
          ) : null}
          <Link
            href={topicsHref({ programId: program.id })}
            aria-label={`${program.name} 프로젝트 보기`}
            className="grid size-9 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)]"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-[1.1rem] fill-none stroke-current stroke-[1.7]">
              <path d="M3.5 5.5h13v9h-13zM7 9h6M7 12h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </header>
      <UiNav aria-label="프로그램 관리 탭" className={`mt-5 ${navStyles.root} ${navStyles.management}`}>
        {TABS.map((entry) => (
          <Link
            key={entry.key}
            href={programManagementHref(program.id, entry.key)}
            aria-current={entry.key === tab ? "page" : undefined}
            className={`${navStyles.item} ${entry.key === tab ? navStyles.itemActive : ""} ${entry.key === "advisors" ? navStyles.admin : ""}`}
          >
            <ManagementTabIcon tab={entry.key} /><UiText>{entry.label}</UiText>{entry.key === "advisors" ? <small><UiText>{"관리 전용"}</UiText></small> : null}
          </Link>
        ))}
      </UiNav>
    </>
  );
}

export async function ProgramCreateWorkspace({ cancelHref }: { cancelHref: string }) {
  const categoryOptions = await listProgramCategories();
  return (
    <div className="page-enter">
      <header className="border-b border-[var(--line)] pb-6">
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]"><UiText>{"새 프로그램"}</UiText></h1>
      </header>
      <div className="pt-5"><ProgramForm categoryOptions={categoryOptions} cancelHref={cancelHref} /></div>
    </div>
  );
}

export async function ProgramManagementWorkspace({
  actor,
  programId,
  tab,
  targetMode = "CURRENT",
  pendingApprovalCount = 0,
}: {
  actor: CurrentActor;
  programId: string;
  tab: ProgramManagementTab;
  targetMode?: "CURRENT" | "DIRECT";
  pendingApprovalCount?: number;
}) {
  let program;
  try {
    program = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).getSettings(actor, programId);
  } catch (error) {
    if (error instanceof ProjectProgramOperationError) {
      return <EmptyState title="프로그램을 찾을 수 없습니다" description="왼쪽에서 다른 프로그램을 선택해 주세요." />;
    }
    throw error;
  }

  let content: React.ReactNode;

  if (tab === "settings") {
    const [categoryOptions, divisions] = await Promise.all([
      listProgramCategories(),
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, _count: { select: { topics: true } } } }),
    ]);
    const tracks = divisions.map((division) => ({ name: division.name }));
    content = <ProgramBasicInfoPanel program={{ id: program.id, name: program.name, category: program.category, description: program.description, isPublic: program.isPublic === true, endsAt: program.endsAt }} categoryOptions={categoryOptions} tracks={tracks} />;
  } else if (tab === "operation") {
    content = <ProgramOperationPanel program={{ id: program.id, advisorEnabled: program.advisorEnabled, studentProjectCreationEnabled: program.studentProjectCreationEnabled, projectTeamMinSize: program.projectTeamMinSize ?? 2, projectTeamMaxSize: program.projectTeamMaxSize ?? 6 }} />;
  } else if (tab === "schedule") {
    content = <ProgramSchedulePanel targetMode={targetMode} program={{ id: program.id, startsAt: program.startsAt, endsAt: program.endsAt, registrationStartsAt: program.projectRegistrationStartsAt ?? program.startsAt, registrationEndsAt: program.projectRegistrationEndsAt ?? program.endsAt, recruitmentStartsAt: program.recruitmentStartsAt, recruitmentEndsAt: program.recruitmentEndsAt, executionStartsAt: program.executionStartsAt, executionEndsAt: program.executionEndsAt, studentProjectCreationEnabled: program.studentProjectCreationEnabled }} />;
  } else if (tab === "votes") {
    const refreshedAt = new Date();
    const votingResults = program.votingPolicy ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshedAt).getResults(actor, program.id) : null;
    const results = votingResults
      ? <ProgramVoteResults results={votingResults} refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshedAt)} policySettingsHref="#voting-policy" />
      : <EmptyState title="투표 정책이 없습니다" description="투표를 사용으로 설정하면 득표현황을 확인할 수 있습니다." />;
    content = <ProgramVotingPanel programId={program.id} votingPolicy={program.votingPolicy ?? null} divisionCount={program.divisions?.length ?? 0} results={results} />;
  } else if (tab === "rubric") {
    const [divisionRecords, rubricRecords] = await Promise.all([
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, rubricMode: true } }),
      prisma.rubricDefinition.findMany({ where: { programId: program.id, archivedAt: null, legacy: false }, orderBy: [{ divisionId: "asc" }, { position: "asc" }], select: { id: true, divisionId: true, title: true, gradingDueAt: true, audience: true, criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } }, evaluations: { select: { _count: { select: { scores: true } } } } } }),
    ]);
    const divisions: RubricDivisionRow[] = divisionRecords;
    const rubrics: RubricRow[] = rubricRecords.map(({ evaluations, ...rubric }) => ({ ...rubric, scoreCount: evaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0) }));
    content = <div className={styles.panel}><section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"채점표"}</UiText></h2></header><RubricManager programId={program.id} divisions={divisions} rubrics={rubrics} /></section></div>;
  } else if (tab === "reports") {
    const records = await prisma.programReportDefinition.findMany({ where: { programId: program.id, archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, title: true, dueAt: true, reports: { select: { _count: { select: { versions: true } } } } } });
    const definitions = records.map(({ reports, ...definition }) => ({ ...definition, versionCount: reports.reduce((sum, report) => sum + report._count.versions, 0) }));
    content = <div className={styles.panel}><section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"보고서"}</UiText></h2></header><ProgramReportRequirementForm programId={program.id} definitions={definitions} /></section></div>;
  } else if (tab === "advisors") {
    if (!program.advisorEnabled) {
      content = <div className={styles.panel}><EmptyState title="지도교수 운영이 꺼져 있습니다" description="자문위원을 배정하려면 운영 설정에서 지도교수 있음을 선택해 주세요." action={<Link href={programManagementHref(program.id, "operation")} className="button-primary"><UiText>{"운영 설정으로 이동"}</UiText></Link>} /></div>;
      return <div className="page-enter"><ProgramManagementHeader program={program} tab={tab} pendingApprovalCount={pendingApprovalCount} /><div className="pt-7">{content}</div></div>;
    }
    const [advisors, topics, matrix] = await Promise.all([
      listProgramAdvisors(prisma, program.id),
      listProgramTopicsForAssignment(prisma, program.id),
      advisorScoreMatrix(prisma, program.id),
    ]);
    content = <div className={styles.panel}><ProgramAdvisorPanel programId={program.id} advisors={advisors} topics={topics} matrix={matrix} /></div>;
  }

  return <div className="page-enter"><ProgramManagementHeader program={program} tab={tab} pendingApprovalCount={pendingApprovalCount} /><div className="pt-7">{content}</div></div>;
}
