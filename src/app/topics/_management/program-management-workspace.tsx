import Link from "next/link";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ProjectProgramOperationError, ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { listProgramCategories } from "@/app/topics/_management/program-categories";
import { ProgramManagerPanel, type ProgramManagerCandidate } from "@/app/topics/_management/program-manager-panel";
import { ProgramForm } from "@/app/topics/_management/program-form";
import {
  type ProgramManagementTab,
  programEvaluationTabs,
  programManagementHref,
} from "@/modules/project-program/ui/program-management-route";
import { ProgramReportMatrixTable } from "@/app/topics/_management/program-report-matrix";
import { ProgramStatusForm } from "@/app/topics/_management/program-status-form";
import { programReportMatrix } from "@/modules/report/infrastructure/prisma-program-report-matrix-query";
import { topicsHref } from "@/app/topics/_lib/topics-query";
import { ProgramReportRequirementForm } from "@/app/topics/_management/program-report-requirement-form";
import { ProjectVoteResultsDialog } from "@/app/topics/_components/project-vote-results-dialog";
import { ProgramAdvisorPanel } from "@/app/topics/_management/program-advisor-panel";
import { ProgramSubmissionDownload } from "@/app/topics/_management/program-submission-download";
import { RubricManager, type RubricDivisionRow, type RubricRow } from "@/app/topics/_management/rubric-manager";
import { ProgramBasicInfoPanel, ProgramOperationPanel, ProgramSchedulePanel, ProgramVotingPanel } from "@/app/topics/_management/program-management-forms";
import styles from "@/app/topics/_management/program-management.module.css";
import navStyles from "@/app/topics/_management/program-section-nav.module.css";
import { ProgramSectionNavIcon, type ProgramSectionNavIconName } from "@/app/topics/_management/program-section-nav";
import { ProgramApprovalLink } from "@/app/topics/_components/program-approval-link";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { advisorScoreMatrix, listProgramAdvisors, listProgramTopicsForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { programScoreboard } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";
import { ProgramScoreboardPanel } from "@/app/topics/_management/program-scoreboard-panel";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink, UiNav } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";
import { AccountIcon, BarChartIcon } from "@/shared/ui/workspace-icons";

export const PROGRAM_MANAGEMENT_TABS: Array<{ key: ProgramManagementTab; label: string }> = [
  { key: "settings", label: "설정" },
  { key: "reports", label: "보고서" },
  { key: "votes", label: "투표" },
  { key: "rubric", label: "채점표" },
  { key: "results", label: "집계" },
  { key: "advisors", label: "자문위원" },
];

/*
  위 줄은 세 칸이다. 여덟 칸을 두 줄에 깔면 무엇이 어디 있는지 매번 다시 읽어야 했다.
  설정(기본 정보, 운영, 일정, 종료)은 한 화면으로 합쳤고, 평가에 쓰는 네 화면은 평가 아래로 묶었다.
*/
const TOP_TABS: Array<{ key: ProgramManagementTab; label: string; icon: ProgramSectionNavIconName }> = [
  { key: "settings", label: "설정", icon: "basic" },
  { key: "reports", label: "보고서", icon: "reports" },
  { key: "votes", label: "평가", icon: "rubric" },
];

function isEvaluationTab(tab: ProgramManagementTab) {
  return (programEvaluationTabs as readonly ProgramManagementTab[]).includes(tab);
}

function EvaluationTabIcon({ tab }: { tab: ProgramManagementTab }) {
  if (tab === "advisors") return <AccountIcon />;
  if (tab === "results") return <BarChartIcon />;
  return <ProgramSectionNavIcon section={tab === "votes" ? "voting" : "rubric"} />;
}

export function ProgramManagementHeader({ program, tab, pendingApprovalCount }: {
  program: { id: string; name: string; isPublic?: boolean; endsAt: Date };
  tab: ProgramManagementTab;
  pendingApprovalCount: number;
}) {
  const status = program.endsAt <= new Date()
    ? { label: "종료", tone: "closed" as const }
    : program.isPublic
      ? { label: "공개", tone: "public" as const }
      : { label: "비공개", tone: "private" as const };
  return (
    <>
      <header className="border-b border-[var(--line)] pb-6">
        <div className={styles.headerRow}>
          <div className={styles.headerTitle}>
            <UiLink
              href={topicsHref({ programId: program.id })}
              aria-label={`${program.name} 프로젝트 목록으로 돌아가기`}
              title="프로젝트 목록으로 돌아가기"
              className={styles.backLink}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="m9 4-6 6 6 6M3.5 10H16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </UiLink>
            <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]">
              <UiText>{program.name}</UiText>
            </h1>
            <span className={styles.programStatus} data-tone={status.tone}><UiText>{status.label}</UiText></span>
            {pendingApprovalCount > 0 ? <ProgramApprovalLink programId={program.id} count={pendingApprovalCount} /> : null}
          </div>
        </div>
      </header>
      <UiNav aria-label="프로그램 관리 탭" className={`mt-5 ${navStyles.root} ${navStyles.management}`}>
        {TOP_TABS.map((entry) => {
          const active = entry.key === "votes" ? isEvaluationTab(tab) : entry.key === tab;
          return (
            <Link
              key={entry.key}
              href={programManagementHref(program.id, entry.key)}
              aria-current={active ? "page" : undefined}
              className={`${navStyles.item} ${active ? navStyles.itemActive : ""}`}
            >
              <ProgramSectionNavIcon section={entry.icon} /><UiText>{entry.label}</UiText>
            </Link>
          );
        })}
      </UiNav>
      {isEvaluationTab(tab) ? (
        <UiNav aria-label="평가 화면" className={navStyles.subnav}>
          {PROGRAM_MANAGEMENT_TABS.filter(({ key }) => isEvaluationTab(key)).map((entry) => (
            <Link
              key={entry.key}
              href={programManagementHref(program.id, entry.key)}
              aria-current={entry.key === tab ? "page" : undefined}
              className={`${navStyles.subItem} ${entry.key === tab ? navStyles.subItemActive : ""}`}
            >
              <EvaluationTabIcon tab={entry.key} /><UiText>{entry.label}</UiText>
            </Link>
          ))}
        </UiNav>
      ) : null}
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
    const [categoryOptions, divisions, admins, managers] = await Promise.all([
      listProgramCategories(),
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, _count: { select: { topics: true } } } }),
      prisma.user.findMany({ where: { role: "ADMIN", accountStatus: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
      prisma.programManager.findMany({ where: { programId: program.id }, select: { userId: true } }),
    ]);
    const tracks = divisions.map((division) => ({ name: division.name }));
    const assignedIds = new Set(managers.map(({ userId }) => userId));
    const managerCandidates: ProgramManagerCandidate[] = admins.map((admin) => ({ ...admin, assigned: assignedIds.has(admin.id) }));
    // 칸마다 저장 단추가 따로 있다. 서로 다른 검사(분과 삭제 확인, 직접 지원 전환)를 거쳐서다.
    // 되돌릴 수 없는 운영 종료는 저장 단추들 사이에 두지 않고 맨 아래에 따로 둔다.
    content = <div className="grid gap-7">
      <div id="basic" className="scroll-mt-24"><ProgramBasicInfoPanel program={{ id: program.id, name: program.name, category: program.category, icon: program.icon, isPublic: program.isPublic === true, endsAt: program.endsAt }} categoryOptions={categoryOptions} tracks={tracks} /></div>
      <ProgramManagerPanel programId={program.id} candidates={managerCandidates} />
      <div id="operation" className="scroll-mt-24"><ProgramOperationPanel program={{ id: program.id, advisorEnabled: program.advisorEnabled, studentProjectCreationEnabled: program.studentProjectCreationEnabled, projectTeamMinSize: program.projectTeamMinSize ?? 2, projectTeamMaxSize: program.projectTeamMaxSize ?? 6 }} /></div>
      <div id="schedule" className="scroll-mt-24"><ProgramSchedulePanel targetMode={targetMode} program={{ id: program.id, startsAt: program.startsAt, endsAt: program.endsAt, registrationStartsAt: program.projectRegistrationStartsAt ?? program.startsAt, registrationEndsAt: program.projectRegistrationEndsAt ?? program.endsAt, recruitmentStartsAt: program.recruitmentStartsAt, recruitmentEndsAt: program.recruitmentEndsAt, executionStartsAt: program.executionStartsAt, executionEndsAt: program.executionEndsAt, studentProjectCreationEnabled: program.studentProjectCreationEnabled }} /></div>
      <div id="close" className={`scroll-mt-24 ${styles.panel}`}><section className={styles.section}><ProgramStatusForm id={program.id} isPublic={program.isPublic === true} endsAt={program.endsAt} showVisibility={false} /></section></div>
    </div>;
  } else if (tab === "votes") {
    const refreshedAt = new Date();
    const votingResults = program.votingPolicy ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshedAt).getResults(actor, program.id) : null;
    const resultsAction = votingResults
      ? <ProjectVoteResultsDialog view={{ mode: "ADMIN", results: votingResults }} triggerLabel="득표현황" />
      : undefined;
    content = <ProgramVotingPanel programId={program.id} votingPolicy={program.votingPolicy ?? null} divisionCount={program.divisions?.length ?? 0} resultsAction={resultsAction} />;
  } else if (tab === "rubric") {
    const [divisionRecords, rubricRecords] = await Promise.all([
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
      prisma.rubricDefinition.findMany({ where: { programId: program.id, archivedAt: null, legacy: false }, orderBy: [{ divisionId: "asc" }, { position: "asc" }], select: { id: true, divisionId: true, title: true, gradingDueAt: true, audience: true, criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } }, evaluations: { select: { _count: { select: { scores: true } } } }, advisorEvaluations: { select: { _count: { select: { scores: true } } } } } }),
    ]);
    const divisions: RubricDivisionRow[] = divisionRecords;
    const rubrics: RubricRow[] = rubricRecords.map(({ evaluations, advisorEvaluations, ...rubric }) => ({ ...rubric, scoreCount: evaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0) + advisorEvaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0) }));
    content = <div className={styles.panel}><section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"채점표"}</UiText></h2></header><RubricManager programId={program.id} divisions={divisions} rubrics={rubrics} /></section></div>;
  } else if (tab === "results") {
    const scoreboard = await programScoreboard(prisma, program.id);
    content = <div className={styles.panel}><section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"심사 집계"}</UiText></h2><p><UiText>{"내부 채점표·자문위원 점수·득표를 한 표로 모읍니다. 순위를 매기는 값은 심사가 정합니다."}</UiText></p></header><ProgramScoreboardPanel programId={program.id} programName={program.name} rows={scoreboard} /></section></div>;
  } else if (tab === "reports") {
    const [records, teamRecords] = await Promise.all([
      prisma.programReportDefinition.findMany({ where: { programId: program.id, archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, title: true, dueAt: true, required: true, reports: { select: { _count: { select: { versions: true } } } } } }),
      prisma.projectTeam.findMany({ where: { project: { programId: program.id } }, orderBy: { name: "asc" }, select: { id: true, name: true, project: { select: { title: true } }, _count: { select: { storedFiles: { where: { status: "ATTACHED", purpose: { not: "ANNOUNCEMENT" } } } } } } }),
    ]);
    const definitions = records.map(({ reports, ...definition }) => ({ ...definition, versionCount: reports.reduce((sum, report) => sum + report._count.versions, 0) }));
    const submissionTeams = teamRecords.map((team) => ({ id: team.id, name: team.name, projectTitle: team.project.title, fileCount: team._count.storedFiles }));
    const matrix = await programReportMatrix(prisma, program.id, new Date());
    content = <div className={styles.panel}>
      <section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"팀별 제출 현황"}</UiText></h2></header><ProgramReportMatrixTable matrix={matrix} /></section>
      <section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"보고서와 마감일"}</UiText></h2></header><ProgramReportRequirementForm programId={program.id} definitions={definitions} /></section>
      <section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"제출물 다운로드"}</UiText></h2><p><UiText>{"팀을 선택해 보고서와 결과물을 ZIP으로 내려받습니다. 관리자만 사용할 수 있습니다."}</UiText></p></header><ProgramSubmissionDownload programId={program.id} teams={submissionTeams} /></section>
    </div>;
  } else if (tab === "advisors") {
    const [advisors, topics, matrix] = await Promise.all([
      listProgramAdvisors(prisma, program.id),
      listProgramTopicsForAssignment(prisma, program.id),
      advisorScoreMatrix(prisma, program.id),
    ]);
    content = <div className={styles.panel}><ProgramAdvisorPanel programId={program.id} advisors={advisors} topics={topics} matrix={matrix} /></div>;
  }

  return <div className="page-enter"><ProgramManagementHeader program={program} tab={tab} pendingApprovalCount={pendingApprovalCount} /><div className="pt-7">{content}</div></div>;
}
