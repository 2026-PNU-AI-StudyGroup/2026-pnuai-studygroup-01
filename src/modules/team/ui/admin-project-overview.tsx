import Link from "next/link";

import type { AdminProjectProgressFilter } from "@/modules/team/ui/admin-project-overview-query";
import type {
  AdminProjectOverviewItem,
  AdminProjectOverviewProgram,
} from "@/modules/team/application/list-admin-project-overview";
import {
  calculateReportSubmissionRate,
  classifyProjectProgressBand,
  hasReportSchedule,
} from "@/modules/team/domain/project-progress";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { EmptyState, ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";
import { ProjectPagination } from "@/shared/ui/project-pagination";

const ADMIN_PROJECTS_PER_PAGE = 20;

const programStatus = {
  DRAFT: { label: "초안", tone: "neutral" },
  OPEN: { label: "운영 중", tone: "info" },
  CLOSED: { label: "마감", tone: "neutral" },
} as const;

// 느린 팀 = 진행 중인데 필수 보고서 제출 기한을 넘긴 프로젝트(객관적 지연 신호).
function projectNeedsAttention(project: AdminProjectOverviewItem): boolean {
  return project.status === "IN_PROGRESS" && project.overdueReportCount > 0;
}
export type ProjectProgressSummary = {
  total: number;
  notStarted: number;
  early: number;
  middle: number;
  late: number;
  finalizing: number;
  completed: number;
  overdue: number;
  withoutReportSchedule: number;
  averageProgress: number | null;
};

export function summarizeProjectProgress(
  projects: AdminProjectOverviewItem[],
): ProjectProgressSummary {
  const summary: ProjectProgressSummary = {
    total: projects.length,
    notStarted: 0,
    early: 0,
    middle: 0,
    late: 0,
    finalizing: 0,
    completed: 0,
    overdue: 0,
    withoutReportSchedule: 0,
    averageProgress: null,
  };
  if (projects.length === 0) return summary;

  let progressTotal = 0;
  let scheduledProjectCount = 0;
  for (const project of projects) {
    if (!hasReportSchedule(project.reportCount)) {
      summary.withoutReportSchedule += 1;
      continue;
    }
    scheduledProjectCount += 1;
    const progress = calculateReportSubmissionRate(
      project.submittedReportCount,
      project.reportCount,
    );
    progressTotal += progress;
    const stage = classifyProjectProgressBand(progress);
    if (stage === "NOT_STARTED") summary.notStarted += 1;
    if (stage === "EARLY") summary.early += 1;
    if (stage === "MIDDLE") summary.middle += 1;
    if (stage === "LATE") summary.late += 1;
    if (stage === "FINALIZING") summary.finalizing += 1;
    if (stage === "COMPLETED") summary.completed += 1;
    if (project.overdueReportCount > 0) summary.overdue += 1;
  }
  if (scheduledProjectCount > 0) {
    summary.averageProgress = Math.round(progressTotal / scheduledProjectCount);
  }
  return summary;
}

const progressFilterPresentation: Array<{
  id: AdminProjectProgressFilter;
  label: string;
  count: (summary: ProjectProgressSummary) => number;
}> = [
  { id: "all", label: "전체", count: (summary) => summary.total },
  { id: "overdue", label: "기한 초과", count: (summary) => summary.overdue },
  { id: "unscheduled", label: "일정 없음", count: (summary) => summary.withoutReportSchedule },
  { id: "not-started", label: "착수 전", count: (summary) => summary.notStarted },
  { id: "early", label: "초기", count: (summary) => summary.early },
  { id: "middle", label: "중반", count: (summary) => summary.middle },
  { id: "late", label: "후반", count: (summary) => summary.late },
  { id: "finalizing", label: "마무리", count: (summary) => summary.finalizing },
  { id: "completed", label: "완료", count: (summary) => summary.completed },
];

function adminProjectOverviewHref({
  programId,
  progress = "all",
  page = 1,
}: {
  programId: string;
  progress?: AdminProjectProgressFilter;
  page?: number;
}) {
  const params = new URLSearchParams({ programId, mode: "manage", tab: "overview" });
  if (progress !== "all") params.set("progress", progress);
  if (page > 1) params.set("page", String(page));
  return `/topics?${params.toString()}`;
}

function ProgressSummary({
  summary,
  programId,
  selectedProgress,
}: {
  summary: ProjectProgressSummary;
  programId: string;
  selectedProgress: AdminProjectProgressFilter;
}) {
  return (
    <UiNav aria-label="프로젝트 진행 구간" className="rounded-[var(--radius-control)] border border-[var(--line)] bg-white p-2 shadow-[0_1px_2px_rgba(31,35,48,0.025)]">
      <ul className="grid gap-1 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        {progressFilterPresentation.map((item) => {
          const selected = item.id === selectedProgress;
          const danger = item.id === "overdue" && item.count(summary) > 0;
          return (
            <li key={item.id}>
              <Link
                href={adminProjectOverviewHref({ programId, progress: item.id })}
                aria-current={selected ? "page" : undefined}
                aria-label={`${item.label} ${item.count(summary)}개`}
                className={`flex min-h-14 items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  selected
                    ? danger
                      ? "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]"
                      : "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                    : danger
                      ? "border-transparent text-[var(--danger)] hover:border-[color-mix(in_srgb,var(--danger)_30%,var(--line))] hover:bg-[var(--danger-subtle)]"
                      : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
                }`}
              >
                <span className="text-xs font-bold"><UiText>{item.label}</UiText></span>
                <strong className="text-base font-bold tabular-nums">{item.count(summary)}</strong>
              </Link>
            </li>
          );
        })}
      </ul>
    </UiNav>
  );
}

function matchesProgressFilter(
  project: AdminProjectOverviewItem,
  progress: AdminProjectProgressFilter,
): boolean {
  if (progress === "all") return true;
  if (progress === "overdue") return project.overdueReportCount > 0;
  if (progress === "unscheduled") return !hasReportSchedule(project.reportCount);
  if (!hasReportSchedule(project.reportCount)) return false;

  const band = classifyProjectProgressBand(calculateReportSubmissionRate(
    project.submittedReportCount,
    project.reportCount,
  ));
  return (
    (progress === "not-started" && band === "NOT_STARTED")
    || (progress === "early" && band === "EARLY")
    || (progress === "middle" && band === "MIDDLE")
    || (progress === "late" && band === "LATE")
    || (progress === "finalizing" && band === "FINALIZING")
    || (progress === "completed" && band === "COMPLETED")
  );
}

export function sortAdminProjects(
  projects: AdminProjectOverviewItem[],
): AdminProjectOverviewItem[] {
  return [...projects].sort((a, b) => {
    const aScheduled = hasReportSchedule(a.reportCount);
    const bScheduled = hasReportSchedule(b.reportCount);
    if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;
    if (aScheduled && bScheduled) {
      const progressDifference = calculateReportSubmissionRate(a.submittedReportCount, a.reportCount)
        - calculateReportSubmissionRate(b.submittedReportCount, b.reportCount);
      if (progressDifference !== 0) return progressDifference;
      const overdueDifference = Number(b.overdueReportCount > 0) - Number(a.overdueReportCount > 0);
      if (overdueDifference !== 0) return overdueDifference;
    }
    return a.name.localeCompare(b.name, "ko");
  });
}

function ManageArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]">
      <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectRow({ project }: { project: AdminProjectOverviewItem }) {
  const titleId = `admin-project-${project.id}-title`;
  const actionId = `admin-project-${project.id}-action`;
  const progress = calculateReportSubmissionRate(
    project.submittedReportCount,
    project.reportCount,
  );
  const status = teamStatusPresentation[project.status];
  const reportScheduleAvailable = hasReportSchedule(project.reportCount);
  const needsAttention = projectNeedsAttention(project);

  return (
    <li className={`group relative grid gap-4 border-t border-[var(--line)] px-4 py-5 transition-colors hover:bg-[var(--surface-subtle)] focus-within:bg-[var(--primary-subtle)] first:border-t-0 sm:px-5 xl:grid-cols-[minmax(0,1fr)_9rem_auto] xl:items-center 2xl:grid-cols-[minmax(0,1.5fr)_9rem_minmax(10rem,0.7fr)_auto] ${needsAttention ? "border-l-2 border-l-[var(--danger)]" : ""}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={titleId} className="break-words font-bold tracking-[-0.02em]">{project.name}</h3>
          <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
          {project.overdueReportCount > 0 ? (
            <StatusBadge tone="danger">
              <UiText>{"제출 기한 초과"}</UiText> {project.overdueReportCount}<UiText>{"건"}</UiText>
            </StatusBadge>
          ) : null}
        </div>
        <p className="mt-1 break-words text-sm text-[var(--muted)]"><UiText>{project.topicTitle}</UiText></p>
      </div>
      <dl className="grid grid-cols-[5rem_1fr] text-sm xl:block">
        {project.advisorEnabled ? <>
          <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"지도교수"}</UiText></dt>
          <dd className="xl:mt-1">{project.professorName}</dd>
        </> : null}
        <dt className={`text-xs font-bold text-[var(--muted)] ${project.advisorEnabled ? "mt-1 xl:hidden" : ""}`}><UiText>{"팀원"}</UiText></dt>
        <dd className="mt-1 xl:text-xs">{project.memberCount}<UiText>{"명"}</UiText></dd>
      </dl>
      {reportScheduleAvailable ? (
        <div className="xl:col-span-3 2xl:col-span-1">
          <ProgressBar value={progress} label={`${project.name} 보고서 제출률`} />
          <p className={`mt-1 text-right text-xs ${
            project.overdueReportCount > 0
              ? "font-bold text-[var(--danger)]"
              : "text-[var(--muted)]"
          }`}>
            {project.submittedReportCount} / {project.reportCount} <UiText>{"보고서 제출"}</UiText>
            {project.overdueReportCount > 0 ? (
              <> · <UiText>{"기한 초과"}</UiText> {project.overdueReportCount}<UiText>{"건"}</UiText></>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-sm font-bold text-[var(--muted)] xl:col-span-3 2xl:col-span-1"><UiText>{"보고서 일정이 없습니다"}</UiText></p>
      )}
      <span
        aria-hidden="true"
        className="button-secondary pointer-events-none justify-self-end gap-1.5 text-sm xl:col-span-3 2xl:col-span-1"
      >
        <UiText>{"관리"}</UiText>
        <ManageArrowIcon />
      </span>
      <Link
        href={`/projects/${project.id}`}
        aria-labelledby={`${titleId} ${actionId}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
      >
        <span id={actionId} className="sr-only"><UiText>{"관리"}</UiText></span>
      </Link>
    </li>
  );
}

function ProgramSection({
  program,
  sectionId,
  selectedProgress,
  requestedPage,
}: {
  program: AdminProjectOverviewProgram;
  sectionId: string;
  selectedProgress: AdminProjectProgressFilter;
  requestedPage: number;
}) {
  const summary = summarizeProjectProgress(program.projects);
  const status = programStatus[program.status];
  const programSectionId = `${sectionId}-program-${program.id}`;
  const attentionCount = program.projects.filter(projectNeedsAttention).length;
  const filteredProjects = sortAdminProjects(
    program.projects.filter((project) => matchesProgressFilter(project, selectedProgress)),
  );
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ADMIN_PROJECTS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const pageProjects = filteredProjects.slice(
    (page - 1) * ADMIN_PROJECTS_PER_PAGE,
    page * ADMIN_PROJECTS_PER_PAGE,
  );
  const selectedFilter = progressFilterPresentation.find(({ id }) => id === selectedProgress)
    ?? progressFilterPresentation[0];

  return (
    <section id={programSectionId} aria-labelledby={`${programSectionId}-title`} className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white shadow-[var(--shadow-admin-panel)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={`${programSectionId}-title`} className="text-lg font-bold tracking-[-0.025em]">{program.name}</h3>
              <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              <UiText>{program.category}</UiText> · <UiText>{`${program.startYear}년 시작`}</UiText>
            </p>
          </div>
          <strong className="text-sm text-[var(--primary)]">
            <UiText>{"프로젝트"}</UiText> {summary.total}<UiText>{"개"}</UiText>
            {summary.total > 0 ? <>
              {" · "}
              {summary.averageProgress === null ? (
                <UiText>{"보고서 일정이 없습니다"}</UiText>
              ) : (
                <><UiText>{"평균 진행률"}</UiText> {summary.averageProgress}%</>
              )}
            </> : null}
            {attentionCount > 0 ? (
              <span className="text-[var(--danger)]">
                {" · "}<UiText>{"느린 팀"}</UiText> {attentionCount}<UiText>{"개"}</UiText>
              </span>
            ) : null}
          </strong>
        </div>
        {summary.total > 0 ? (
          <div className="mt-5">
            <ProgressSummary
              summary={summary}
              programId={program.id}
              selectedProgress={selectedProgress}
            />
          </div>
        ) : null}
      </header>
      {program.projects.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3 sm:px-5">
            <h4 className="text-sm font-bold"><UiText>{selectedFilter.label}</UiText></h4>
            <p className="text-xs font-bold text-[var(--muted)]">
              <strong className="text-[var(--ink)]">{filteredProjects.length}</strong><UiText>{"개"}</UiText>
            </p>
          </div>
          {pageProjects.length > 0 ? (
            <ol>
              {pageProjects.map((project) => <ProjectRow key={project.id} project={project} />)}
            </ol>
          ) : (
            <div className="px-5">
              <EmptyState
                variant="section"
                title="해당 진행 구간의 프로젝트가 없습니다"
                description="다른 진행 구간을 선택하거나 전체 프로젝트를 확인해 주세요."
                action={<Link href={adminProjectOverviewHref({ programId: program.id })} className="button-secondary"><UiText>{"전체 프로젝트 보기"}</UiText></Link>}
              />
            </div>
          )}
          <div className="px-4 pb-6 sm:px-5">
            <ProjectPagination
              page={page}
              totalPages={totalPages}
              ariaLabel="관리자 프로젝트 현황 페이지"
              href={(nextPage) => adminProjectOverviewHref({
                programId: program.id,
                progress: selectedProgress,
                page: nextPage,
              })}
            />
          </div>
        </>
      ) : (
        <div className="px-5">
          <EmptyState variant="section" title="이 프로그램에는 아직 운영 중인 프로젝트가 없습니다" description="프로젝트가 공개되고 팀이 구성되면 운영 현황이 표시됩니다." />
        </div>
      )}
    </section>
  );
}

export function AdminProjectOverviewContent({
  programs,
  selectedProgramId: requestedProgramId,
  selectedProgress = "all",
  requestedPage = 1,
}: {
  programs: AdminProjectOverviewProgram[];
  selectedProgramId?: string;
  selectedProgress?: AdminProjectProgressFilter;
  requestedPage?: number;
}) {
  const defaultProgram = programs.find(({ status }) => status !== "CLOSED") ?? programs[0];
  const selectedProgramId = programs.some(({ id }) => id === requestedProgramId)
    ? requestedProgramId
    : defaultProgram?.id;
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);

  return selectedProgram ? (
    <ProgramSection
      program={selectedProgram}
      sectionId="selected"
      selectedProgress={selectedProgress}
      requestedPage={requestedPage}
    />
  ) : (
    <EmptyState title="등록된 프로그램이 없습니다" description="프로그램이 등록되면 프로젝트 운영 현황을 확인할 수 있습니다." />
  );
}
