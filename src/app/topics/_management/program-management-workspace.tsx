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
import { ProjectVoteResultsDialog } from "@/app/topics/_components/project-vote-results-dialog";
import { ProgramAdvisorPanel } from "@/app/topics/_management/program-advisor-panel";
import { ProgramSubmissionDownload } from "@/app/topics/_management/program-submission-download";
import { RubricManager, type RubricDivisionRow, type RubricRow } from "@/app/topics/_management/rubric-manager";
import { ProgramBasicInfoPanel, ProgramOperationPanel, ProgramSchedulePanel, ProgramVotingPanel } from "@/app/topics/_management/program-management-forms";
import styles from "@/app/topics/_management/program-management.module.css";
import navStyles from "@/app/topics/_management/program-section-nav.module.css";
import { ProgramSectionNavIcon, type ProgramSectionNavIconName } from "@/app/topics/_management/program-section-nav";
import { ProgramApprovalLink } from "@/app/topics/_components/program-approval-link";
import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { advisorScoreMatrix, listProgramAdvisors, listProgramTopicsForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink, UiNav } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";
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
  showApprovals = false,
}: {
  actor: CurrentActor;
  programId: string;
  tab: ProgramManagementTab;
  targetMode?: "CURRENT" | "DIRECT";
  pendingApprovalCount?: number;
  showApprovals?: boolean;
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

  if (showApprovals) {
    const requests = await new TopicApprovalService(
      new PrismaTopicApprovalRepository(prisma),
      new PrismaProjectProgramRepository(prisma),
    ).list(actor, 1, 50, { programId: program.id, status: "PENDING" });
    content = requests.items.length
      ? <ProjectApprovalLedger adminSurface requests={requests.items} total={requests.total} student={false} title="승인 대기" />
      : <EmptyState title="승인 대기 요청이 없습니다" description="새 학생 프로젝트 등록이 접수되면 여기에 표시됩니다." />;
  } else if (tab === "settings") {
    const [categoryOptions, divisions] = await Promise.all([
      listProgramCategories(),
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, _count: { select: { topics: true } } } }),
    ]);
    const tracks = divisions.map((division) => ({ name: division.name }));
    content = <ProgramBasicInfoPanel program={{ id: program.id, name: program.name, category: program.category, isPublic: program.isPublic === true, endsAt: program.endsAt }} categoryOptions={categoryOptions} tracks={tracks} />;
  } else if (tab === "operation") {
    content = <ProgramOperationPanel program={{ id: program.id, advisorEnabled: program.advisorEnabled, studentProjectCreationEnabled: program.studentProjectCreationEnabled, projectTeamMinSize: program.projectTeamMinSize ?? 2, projectTeamMaxSize: program.projectTeamMaxSize ?? 6 }} />;
  } else if (tab === "schedule") {
    content = <ProgramSchedulePanel targetMode={targetMode} program={{ id: program.id, startsAt: program.startsAt, endsAt: program.endsAt, registrationStartsAt: program.projectRegistrationStartsAt ?? program.startsAt, registrationEndsAt: program.projectRegistrationEndsAt ?? program.endsAt, recruitmentStartsAt: program.recruitmentStartsAt, recruitmentEndsAt: program.recruitmentEndsAt, executionStartsAt: program.executionStartsAt, executionEndsAt: program.executionEndsAt, studentProjectCreationEnabled: program.studentProjectCreationEnabled }} />;
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
  } else if (tab === "reports") {
    const [records, teamRecords] = await Promise.all([
      prisma.programReportDefinition.findMany({ where: { programId: program.id, archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, title: true, dueAt: true, required: true, reports: { select: { _count: { select: { versions: true } } } } } }),
      prisma.projectTeam.findMany({ where: { project: { programId: program.id } }, orderBy: { name: "asc" }, select: { id: true, name: true, project: { select: { title: true } }, _count: { select: { storedFiles: { where: { status: "ATTACHED", purpose: { not: "ANNOUNCEMENT" } } } } } } }),
    ]);
    const definitions = records.map(({ reports, ...definition }) => ({ ...definition, versionCount: reports.reduce((sum, report) => sum + report._count.versions, 0) }));
    const submissionTeams = teamRecords.map((team) => ({ id: team.id, name: team.name, projectTitle: team.project.title, fileCount: team._count.storedFiles }));
    content = <div className={styles.panel}>
      <section className={styles.section}><header className={styles.sectionHeader}><h2><UiText>{"보고서"}</UiText></h2></header><ProgramReportRequirementForm programId={program.id} definitions={definitions} /></section>
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
