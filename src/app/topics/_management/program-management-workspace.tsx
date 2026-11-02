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
import { ProgramApprovalLink } from "@/app/topics/_components/program-approval-link";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { cardClass, CardHead, daysLabel, daysUntil, ObjectHeader, Pill } from "@/modules/project-program/ui/work-screen";
import { schedulePhaseState } from "@/modules/team/ui/task-presentation";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { advisorScoreMatrix, listProgramAdvisors, listProgramTopicsForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { programScoreboard } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";
import { ProgramScoreboardPanel } from "@/app/topics/_management/program-scoreboard-panel";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink, UiNav } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";
import { ProgramIcon } from "@/shared/ui/program-icon";
import type { ReactNode } from "react";

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
const TOP_TABS: Array<{ key: ProgramManagementTab; label: string }> = [
  { key: "settings", label: "설정" },
  { key: "reports", label: "보고서" },
  { key: "votes", label: "평가" },
];

function isEvaluationTab(tab: ProgramManagementTab) {
  return (programEvaluationTabs as readonly ProgramManagementTab[]).includes(tab);
}

type HeaderProgram = {
  id: string;
  name: string;
  isPublic?: boolean;
  endsAt: Date;
  icon?: ProgramIconKey;
  category?: string;
  startsAt?: Date;
};

/**
 * 프로그램 관리 머리. 사업 화면과 같은 대상 머리(아이콘, 이름, 상태, 분류와 기간, 데이터에서 뽑은 한 줄)
 * 아래에 밑줄 탭을 둔다. 평가 안의 네 화면은 탭 아래 회색 판 위의 작은 칸으로 고른다.
 */
export function ProgramManagementHeader({ program, tab, pendingApprovalCount, finding }: {
  program: HeaderProgram;
  tab: ProgramManagementTab;
  pendingApprovalCount: number;
  finding?: ReactNode;
}) {
  const status = program.endsAt <= new Date()
    ? { label: "종료", tone: "plain" as const }
    : program.isPublic
      ? { label: "공개", tone: "accent" as const }
      : { label: "비공개", tone: "plain" as const };
  return (
    <div className="grid gap-3.5">
      <ObjectHeader
        id="program-management-title"
        media={program.icon ? (
          <div aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-[var(--radius-panel)] bg-[var(--accent-subtle)] text-[var(--accent)]">
            <ProgramIcon icon={program.icon} className="size-6" />
          </div>
        ) : undefined}
        title={<UiText>{program.name}</UiText>}
        titleAside={(
          <>
            <Pill tone={status.tone}>{status.label}</Pill>
            {pendingApprovalCount > 0 ? <ProgramApprovalLink programId={program.id} count={pendingApprovalCount} /> : null}
          </>
        )}
        meta={program.category ? (
          <>
            <UiText>{program.category}</UiText>
            {program.startsAt ? <>, <span className="tabular-nums"><UiDate value={program.startsAt} /> ~ <UiDate value={program.endsAt} /></span></> : null}
          </>
        ) : undefined}
        finding={finding}
        actions={(
          <UiLink
            href={topicsHref({ programId: program.id })}
            aria-label={`${program.name} 프로젝트 목록으로 돌아가기`}
            className="button-secondary button-compact gap-1.5"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.6]">
              <path d="m9 4-6 6 6 6M3.5 10H16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <UiText>{"프로젝트 목록"}</UiText>
          </UiLink>
        )}
      />
      <UiNav aria-label="프로그램 관리 탭" className="flex gap-5 overflow-x-auto border-b border-[var(--line)]">
        {TOP_TABS.map((entry) => {
          const active = entry.key === "votes" ? isEvaluationTab(tab) : entry.key === tab;
          return (
            <Link
              key={entry.key}
              href={programManagementHref(program.id, entry.key)}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 py-2.5 text-sm font-medium transition-colors ${active ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              <UiText>{entry.label}</UiText>
            </Link>
          );
        })}
      </UiNav>
      {isEvaluationTab(tab) ? (
        <UiNav aria-label="평가 화면" className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-0.5">
          {PROGRAM_MANAGEMENT_TABS.filter(({ key }) => isEvaluationTab(key)).map((entry) => (
            <Link
              key={entry.key}
              href={programManagementHref(program.id, entry.key)}
              aria-current={entry.key === tab ? "page" : undefined}
              className={`inline-flex h-8 items-center whitespace-nowrap rounded-[0.3125rem] px-3 text-[0.8125rem] font-medium transition-colors ${entry.key === tab ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_0_0_1px_var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              <UiText>{entry.label}</UiText>
            </Link>
          ))}
        </UiNav>
      ) : null}
    </div>
  );
}

type ScheduleProgram = {
  startsAt: Date;
  endsAt: Date;
  projectRegistrationStartsAt?: Date | null;
  projectRegistrationEndsAt?: Date | null;
  recruitmentStartsAt?: Date | null;
  recruitmentEndsAt?: Date | null;
  executionStartsAt?: Date | null;
  executionEndsAt?: Date | null;
  votingPolicy?: { startsAt: Date; endsAt: Date } | null;
};

/**
 * 머리 아래 한 줄. 지금 걸린 기간 하나와 끝나는 날을 적는다.
 * 기간은 겹친다(운영 안에 등록, 모집, 수행). 사업 화면 일정 카드처럼 가장 좁은 기간 하나를 고른다.
 */
function scheduleFinding(program: ScheduleProgram, now: Date): ReactNode {
  if (now > program.endsAt) return <UiText>{"운영이 끝난 프로그램입니다."}</UiText>;
  if (now < program.startsAt) return <UiText>{`운영 시작까지 ${daysUntil(program.startsAt, now)}일 남았습니다.`}</UiText>;
  const periods: Array<[string, Date | null | undefined, Date | null | undefined]> = [
    ["운영", program.startsAt, program.endsAt],
    ["프로젝트 등록", program.projectRegistrationStartsAt, program.projectRegistrationEndsAt],
    ["모집", program.recruitmentStartsAt, program.recruitmentEndsAt],
    ["수행", program.executionStartsAt, program.executionEndsAt],
    ["투표", program.votingPolicy?.startsAt, program.votingPolicy?.endsAt],
  ];
  const current = periods
    .filter((period): period is [string, Date, Date] => Boolean(period[1] && period[2]))
    .filter(([, start, end]) => schedulePhaseState(start, end, now) === "CURRENT")
    .at(-1);
  if (!current) return undefined;
  const [label, , end] = current;
  return (
    <>
      <b className="font-semibold"><UiText>{`지금은 ${label} 기간입니다.`}</UiText></b>{" "}
      <span className="tabular-nums"><UiDate value={end} /></span>{" "}<UiText>{"종료"}</UiText>, <UiText>{daysLabel(daysUntil(end, now))}</UiText>.
    </>
  );
}

/** 설정 한 칸. 왼쪽에 제목과 설명(또는 지금 값 요약), 오른쪽에 입력 판을 둔다. 좁으면 위아래로 쌓는다. */
function SettingsRow({ id, title, description, aside, children }: {
  id: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-3 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
      <div className="min-w-0">
        <h2 id={`${id}-title`} className="text-base font-semibold leading-[1.375rem] text-[var(--ink)]"><UiText>{title}</UiText></h2>
        <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--muted)]"><UiText>{description}</UiText></p>
        {aside ? <div className="mt-3 text-[0.8125rem] text-[var(--ink)]">{aside}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** 평가와 보고서 화면의 카드 한 장. */
function WorkCard({ id, title, count, action, children }: {
  id: string;
  title: string;
  count?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`${cardClass} @container`}>
      <CardHead id={id} title={<UiText>{title}</UiText>} count={count} action={action} />
      {children}
    </section>
  );
}

export async function ProgramCreateWorkspace({ cancelHref }: { cancelHref: string }) {
  const categoryOptions = await listProgramCategories();
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)]"><UiText>{"새 프로그램"}</UiText></h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]"><UiText>{"기본 정보와 운영 설정, 일정을 정하면 등록할 수 있습니다. 투표, 채점표, 보고서는 나중에 관리 화면에서 더해도 됩니다."}</UiText></p>
      </header>
      <ProgramForm categoryOptions={categoryOptions} cancelHref={cancelHref} />
    </div>
  );
}

const participationLabel = (studentProjectCreationEnabled: boolean) => studentProjectCreationEnabled
  ? "학생이 등록, 관계자가 승인"
  : "관계자가 등록, 학생이 지원";

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

  const now = new Date();
  let content: ReactNode;

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
    const assignedNames = managerCandidates.filter(({ assigned }) => assigned).map(({ name }) => name);
    const teamMin = program.projectTeamMinSize ?? 2;
    const teamMax = program.projectTeamMaxSize ?? 6;
    // 칸마다 저장 단추가 따로 있다. 서로 다른 검사(분과 삭제 확인, 직접 지원 전환)를 거쳐서다.
    // 되돌릴 수 없는 운영 종료는 저장 단추들 사이에 두지 않고 맨 아래에 따로 둔다.
    // 왼쪽 칸에는 설명 아래 지금 저장된 값을 적어, 판을 열어 읽지 않아도 무엇이 정해져 있는지 보이게 한다.
    content = <div className="grid gap-5 [&>section+section]:border-t [&>section+section]:border-[var(--line)] [&>section+section]:pt-5">
      <SettingsRow
        id="basic"
        title="기본 정보"
        description="분류, 이름, 공개 여부, 아이콘과 분과입니다. 분과를 지우면 저장하기 전에 영향을 먼저 알려 줍니다."
        aside={<UiText>{divisions.length ? `분과 ${divisions.length}개: ${divisions.map((division) => `${division.name} ${division._count.topics}개`).join(", ")}` : "분과 없음"}</UiText>}
      >
        <ProgramBasicInfoPanel program={{ id: program.id, name: program.name, category: program.category, icon: program.icon, isPublic: program.isPublic === true, endsAt: program.endsAt }} categoryOptions={categoryOptions} tracks={tracks} />
      </SettingsRow>
      <SettingsRow
        id="managers"
        title="담당 관리자"
        description="이 프로그램의 운영 알림 메일을 담당자에게만 보냅니다. 아무도 고르지 않으면 관리자 전체에게 갑니다."
        aside={<UiText>{assignedNames.length ? `지금 담당: ${assignedNames.join(", ")}` : "지금은 관리자 전체에게 갑니다."}</UiText>}
      >
        <ProgramManagerPanel programId={program.id} candidates={managerCandidates} />
      </SettingsRow>
      <SettingsRow
        id="operation"
        title="운영 설정"
        description="지도교수 유무, 프로젝트 참여 방식, 팀 인원입니다."
        aside={<UiText>{`${participationLabel(program.studentProjectCreationEnabled)}, ${program.studentProjectCreationEnabled ? `팀 ${teamMin}~${teamMax}명` : `팀 최대 ${teamMax}명`}, ${program.advisorEnabled ? "지도교수 있음" : "지도교수 없음"}`}</UiText>}
      >
        <ProgramOperationPanel program={{ id: program.id, advisorEnabled: program.advisorEnabled, studentProjectCreationEnabled: program.studentProjectCreationEnabled, projectTeamMinSize: teamMin, projectTeamMaxSize: teamMax }} />
      </SettingsRow>
      <SettingsRow
        id="schedule"
        title="일정"
        description="운영 기간 안에 프로젝트 등록, 모집, 수행 기간을 둡니다. 지금 걸린 기간은 머리 아래 한 줄에 있습니다."
      >
        <ProgramSchedulePanel targetMode={targetMode} program={{ id: program.id, startsAt: program.startsAt, endsAt: program.endsAt, registrationStartsAt: program.projectRegistrationStartsAt ?? program.startsAt, registrationEndsAt: program.projectRegistrationEndsAt ?? program.endsAt, recruitmentStartsAt: program.recruitmentStartsAt, recruitmentEndsAt: program.recruitmentEndsAt, executionStartsAt: program.executionStartsAt, executionEndsAt: program.executionEndsAt, studentProjectCreationEnabled: program.studentProjectCreationEnabled }} />
      </SettingsRow>
      <SettingsRow id="close" title="운영 종료" description="되돌리려면 일정에서 종료일을 다시 늘려야 합니다.">
        <div className={cardClass}><ProgramStatusForm id={program.id} isPublic={program.isPublic === true} endsAt={program.endsAt} showVisibility={false} /></div>
      </SettingsRow>
    </div>;
  } else if (tab === "votes") {
    const refreshedAt = new Date();
    const votingResults = program.votingPolicy ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshedAt).getResults(actor, program.id) : null;
    const policy = program.votingPolicy;
    content = (
      <SettingsRow
        id="voting"
        title="투표"
        description="투표 기간, 1인당 표 수, 한도 적용 기준과 결과 공개 시점입니다."
        aside={(
          <div className="grid gap-2.5">
            <p><UiText>{policy ? `${policy.voteLimitScope === "DIVISION" ? "분과마다" : "프로그램 전체에서"} 학생과 교수 ${policy.voteLimit}표, 자문위원과 관리자 ${policy.staffVoteLimit}표` : "투표를 쓰지 않습니다."}</UiText></p>
            {votingResults ? <div className="[&>button]:min-h-8 [&>button]:px-3 [&>button]:py-1 [&>button]:text-[0.8125rem] [&>button]:font-medium"><ProjectVoteResultsDialog view={{ mode: "ADMIN", results: votingResults }} triggerLabel="득표현황" /></div> : null}
          </div>
        )}
      >
        <ProgramVotingPanel programId={program.id} votingPolicy={program.votingPolicy ?? null} divisionCount={program.divisions?.length ?? 0} />
      </SettingsRow>
    );
  } else if (tab === "rubric") {
    const [divisionRecords, rubricRecords] = await Promise.all([
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
      prisma.rubricDefinition.findMany({ where: { programId: program.id, archivedAt: null, legacy: false }, orderBy: [{ divisionId: "asc" }, { position: "asc" }], select: { id: true, divisionId: true, title: true, gradingDueAt: true, audience: true, criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } }, evaluations: { select: { _count: { select: { scores: true } } } }, advisorEvaluations: { select: { _count: { select: { scores: true } } } } } }),
    ]);
    const divisions: RubricDivisionRow[] = divisionRecords;
    const rubrics: RubricRow[] = rubricRecords.map(({ evaluations, advisorEvaluations, ...rubric }) => ({ ...rubric, scoreCount: evaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0) + advisorEvaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0) }));
    content = (
      <WorkCard id="rubric-title" title="채점표" count={<>{rubrics.length}<UiText>{"개"}</UiText></>}>
        <div className="px-5 pb-5"><RubricManager programId={program.id} divisions={divisions} rubrics={rubrics} /></div>
      </WorkCard>
    );
  } else if (tab === "results") {
    const scoreboard = await programScoreboard(prisma, program.id);
    content = <ProgramScoreboardPanel programId={program.id} programName={program.name} rows={scoreboard} />;
  } else if (tab === "reports") {
    const [records, teamRecords] = await Promise.all([
      prisma.programReportDefinition.findMany({ where: { programId: program.id, archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, title: true, dueAt: true, required: true, reports: { select: { _count: { select: { versions: true } } } } } }),
      prisma.projectTeam.findMany({ where: { project: { programId: program.id } }, orderBy: { name: "asc" }, select: { id: true, name: true, project: { select: { title: true } }, _count: { select: { storedFiles: { where: { status: "ATTACHED", purpose: { not: "ANNOUNCEMENT" } } } } } } }),
    ]);
    const definitions = records.map(({ reports, ...definition }) => ({ ...definition, versionCount: reports.reduce((sum, report) => sum + report._count.versions, 0) }));
    const submissionTeams = teamRecords.map((team) => ({ id: team.id, name: team.name, projectTitle: team.project.title, fileCount: team._count.storedFiles }));
    const matrix = await programReportMatrix(prisma, program.id, now);
    content = <div className="grid gap-3.5">
      <WorkCard id="report-matrix-title" title="팀별 제출 현황" count={matrix.rows.length ? <UiText>{`팀 ${matrix.rows.length}개, 보고서 ${matrix.columns.length}개`}</UiText> : undefined}>
        <ProgramReportMatrixTable matrix={matrix} />
      </WorkCard>
      <ProgramReportRequirementForm programId={program.id} definitions={definitions} />
      <WorkCard id="report-download-title" title="제출물 다운로드" count={<UiText>{"관리자 전용"}</UiText>}>
        <ProgramSubmissionDownload programId={program.id} teams={submissionTeams} />
      </WorkCard>
    </div>;
  } else if (tab === "advisors") {
    const [advisors, topics, matrix] = await Promise.all([
      listProgramAdvisors(prisma, program.id),
      listProgramTopicsForAssignment(prisma, program.id),
      advisorScoreMatrix(prisma, program.id),
    ]);
    content = <ProgramAdvisorPanel programId={program.id} advisors={advisors} topics={topics} matrix={matrix} />;
  }

  return (
    <div className="grid gap-4">
      <ProgramManagementHeader program={program} tab={tab} pendingApprovalCount={pendingApprovalCount} finding={scheduleFinding(program, now)} />
      {content}
    </div>
  );
}
