import Link from "next/link";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ProjectProgramOperationError, ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { listProgramCategories } from "@/app/topics/_management/program-categories";
import { ProgramForm } from "@/app/topics/_management/program-form";
import { ProgramIconForm } from "@/app/topics/_management/program-icon-picker";
import {
  type ProgramManagementTab,
  programManagementHref,
  programProjectsHref,
} from "@/modules/project-program/ui/program-management-query";
import { ProgramPolicyForm } from "@/app/topics/_management/program-policy-form";
import { ProgramReportRequirementForm } from "@/app/topics/_management/program-report-requirement-form";
import { ProgramStatusForm } from "@/app/topics/_management/program-status-form";
import { ProgramVoteResults } from "@/app/topics/_management/program-vote-results";
import { RubricManager, type RubricDivisionRow, type RubricRow } from "@/app/topics/_management/rubric-manager";
import { StudentProjectCreationForm } from "@/app/topics/_management/student-project-creation-form";
import { TrackManager, type TrackRow } from "@/app/topics/_management/track-manager";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import type { AdminProjectOverviewProgram } from "@/modules/team/application/list-admin-project-overview";
import type { AdminProjectProgressFilter } from "@/modules/team/ui/admin-project-overview-query";
import { AdminProjectOverviewContent } from "@/modules/team/ui/admin-project-overview";
import { UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { FormSection } from "@/shared/ui/form-system";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const TABS: Array<{ key: ProgramManagementTab; label: string }> = [
  { key: "overview", label: "현황" },
  { key: "settings", label: "설정" },
  { key: "rubric", label: "채점표" },
  { key: "tracks", label: "분과" },
  { key: "reports", label: "보고서" },
  { key: "votes", label: "투표" },
];

function ProgramManagementHeader({ program, tab }: {
  program: { id: string; name: string; isStudentPublic?: boolean; isFacultyPublic?: boolean; endsAt: Date };
  tab: ProgramManagementTab;
}) {
  const status = program.endsAt <= new Date()
    ? { label: "종료", tone: "neutral" as const }
    : program.isStudentPublic || program.isFacultyPublic
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
          <Link
            href={programProjectsHref(program.id)}
            aria-label={`${program.name} 프로젝트 보기`}
            className="grid size-9 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)]"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-[1.1rem] fill-none stroke-current stroke-[1.7]">
              <path d="M3.5 5.5h13v9h-13zM7 9h6M7 12h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{"프로그램의 프로젝트와 운영 설정을 한 화면에서 관리합니다."}</UiText></p>
      </header>
      <UiNav aria-label="프로그램 관리 탭" className="mt-5 flex flex-wrap gap-1 border-b border-[var(--line)]">
        {TABS.map((entry) => (
          <Link
            key={entry.key}
            href={programManagementHref(program.id, entry.key)}
            aria-current={entry.key === tab ? "page" : undefined}
            className={`relative -mb-px px-4 py-2.5 text-sm font-semibold ${entry.key === tab ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            <UiText>{entry.label}</UiText>
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
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{"프로그램의 기본 정보와 전체 운영 일정을 등록합니다."}</UiText></p>
      </header>
      <div className="pt-5"><ProgramForm categoryOptions={categoryOptions} cancelHref={cancelHref} /></div>
    </div>
  );
}

export async function ProgramManagementWorkspace({
  actor,
  programId,
  tab,
  overviewPrograms,
  selectedProgress,
  requestedPage,
}: {
  actor: CurrentActor;
  programId: string;
  tab: ProgramManagementTab;
  overviewPrograms: AdminProjectOverviewProgram[];
  selectedProgress: AdminProjectProgressFilter;
  requestedPage: number;
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

  if (tab === "overview") {
    content = <AdminProjectOverviewContent programs={overviewPrograms} selectedProgramId={program.id} selectedProgress={selectedProgress} requestedPage={requestedPage} />;
  } else if (tab === "settings") {
    const [categoryOptions, reportScheduleWarningCount, guidanceScheduleWarningCount] = await Promise.all([
      listProgramCategories(),
      prisma.report.count({ where: { projectTeam: { project: { programId: program.id } }, OR: [{ dueAt: { lt: program.submissionStartsAt } }, { dueAt: { gt: program.submissionEndsAt } }] } }),
      prisma.projectGuidanceRequest.count({ where: { projectTeam: { project: { programId: program.id } }, scheduledAt: { not: null }, OR: [{ scheduledAt: { lt: program.executionStartsAt } }, { scheduledAt: { gt: program.executionEndsAt } }] } }),
    ]);
    const warnings = [
      reportScheduleWarningCount ? `제출 기간 밖의 보고서 마감 ${reportScheduleWarningCount}건` : null,
      guidanceScheduleWarningCount ? `수행 기간 밖의 확정 회의 ${guidanceScheduleWarningCount}건` : null,
    ].filter((warning): warning is string => Boolean(warning));
    content = <div className="grid gap-4">
      {warnings.length ? <UiAside role="status" aria-label="일정 확인 필요" className="rounded-[var(--radius-panel)] border border-[var(--warning)] bg-[var(--warning-subtle)] px-5 py-4 text-sm text-[var(--warning-ink)]"><p className="font-bold"><UiText>{"현재 프로그램 일정과 맞지 않는 항목이 있습니다."}</UiText></p><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}><UiText>{warning}</UiText></li>)}</ul></UiAside> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <ProgramPolicyForm programId={program.id} name={program.name} category={program.category} categoryOptions={categoryOptions} description={program.description} startsAt={program.startsAt} endsAt={program.endsAt} advisorEnabled={program.advisorEnabled} registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt} registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt} recruitmentStartsAt={program.recruitmentStartsAt} recruitmentEndsAt={program.recruitmentEndsAt} executionStartsAt={program.executionStartsAt} executionEndsAt={program.executionEndsAt} submissionStartsAt={program.submissionStartsAt} submissionEndsAt={program.submissionEndsAt} votingPolicy={program.votingPolicy ?? null} divisionCount={program.divisions?.length ?? 0} />
        <UiAside aria-label="보조 운영 설정" className="grid gap-4"><StudentProjectCreationForm id={program.id} enabled={program.studentProjectCreationEnabled} minSize={program.projectTeamMinSize ?? 2} maxSize={program.projectTeamMaxSize ?? 6} /><ProgramIconForm id={program.id} icon={program.icon} /></UiAside>
      </div>
      <ProgramStatusForm id={program.id} isStudentPublic={program.isStudentPublic === true} isFacultyPublic={program.isFacultyPublic === true} endsAt={program.endsAt} />
    </div>;
  } else if (tab === "rubric") {
    const [divisionRecords, rubricRecords] = await Promise.all([
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, rubricMode: true } }),
      prisma.rubricDefinition.findMany({ where: { programId: program.id, archivedAt: null, legacy: false }, orderBy: [{ divisionId: "asc" }, { position: "asc" }], select: { id: true, divisionId: true, title: true, gradingDueAt: true, audience: true, criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } }, evaluations: { select: { _count: { select: { scores: true } } } } } }),
    ]);
    const divisions: RubricDivisionRow[] = divisionRecords;
    const rubrics: RubricRow[] = rubricRecords.map(({ evaluations, ...rubric }) => ({ ...rubric, scoreCount: evaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0) }));
    content = <FormSection title="채점표" description="보고서와 별개인 팀 평가를 공통 또는 분과 전용으로 구성합니다."><RubricManager programId={program.id} divisions={divisions} rubrics={rubrics} /></FormSection>;
  } else if (tab === "tracks") {
    const divisions = await prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, _count: { select: { topics: true } } } });
    const rows: TrackRow[] = divisions.map((division) => ({ id: division.id, name: division.name, projectCount: division._count.topics }));
    content = <FormSection title="분과" description="분과가 하나 이상이면 새 프로젝트는 반드시 하나의 분과를 선택합니다."><TrackManager programId={program.id} tracks={rows} /></FormSection>;
  } else if (tab === "reports") {
    const records = await prisma.programReportDefinition.findMany({ where: { programId: program.id, archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, title: true, dueAt: true, reports: { select: { _count: { select: { versions: true } } } } } });
    const definitions = records.map(({ reports, ...definition }) => ({ ...definition, versionCount: reports.reduce((sum, report) => sum + report._count.versions, 0) }));
    content = <FormSection title="보고서" description="제출 보고서의 제목, 마감, 순서를 관리합니다."><ProgramReportRequirementForm programId={program.id} definitions={definitions} /></FormSection>;
  } else {
    const refreshedAt = new Date();
    const votingResults = program.votingPolicy ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshedAt).getResults(actor, program.id) : null;
    const policyHref = `${programManagementHref(program.id, "settings")}#voting-policy`;
    content = votingResults ? <FormSection title="득표현황" description="현재 집계와 최종 결과를 확인합니다."><ProgramVoteResults results={votingResults} refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshedAt)} policySettingsHref={policyHref} /></FormSection> : <EmptyState title="투표 정책이 없는 프로그램입니다" description="투표 기간과 인당 가능 투표수를 설정하면 현황을 확인할 수 있습니다." action={<Link href={policyHref} className="button-primary"><UiText>{"투표 정책 설정"}</UiText></Link>} />;
  }

  return <div className="page-enter"><ProgramManagementHeader program={program} tab={tab} /><div className="pt-7">{content}</div></div>;
}
