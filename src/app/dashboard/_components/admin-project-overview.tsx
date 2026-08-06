import Link from "next/link";

import type { AdminProjectProgressFilter } from "@/app/dashboard/_lib/admin-project-overview-query";
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
import { UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";
import { ProgramIcon } from "@/shared/ui/program-icon";
import { ProjectPagination } from "@/shared/ui/project-pagination";

const ADMIN_PROJECTS_PER_PAGE = 20;

const programStatus = {
  DRAFT: { label: "초안", tone: "neutral" },
  OPEN: { label: "운영 중", tone: "info" },
  CLOSED: { label: "마감", tone: "neutral" },
} as const;

// 느린 팀 = 진행 중인데 필수 보고서 제출 기한을 넘긴 프로젝트(객관적 지연 신호).
function projectNeedsAttention(project: AdminProjectOverviewItem): boolean {
  return project.status === "CONFIRMED" && project.overdueReportCount > 0;
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
  const params = new URLSearchParams({ programId });
  if (progress !== "all") params.set("progress", progress);
  if (page > 1) params.set("page", String(page));
  return `/dashboard?${params.toString()}`;
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
                <span className="text-xs font-black"><UiText>{item.label}</UiText></span>
                <strong className="text-base font-black tabular-nums">{item.count(summary)}</strong>
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

function ProjectRow({ project }: { project: AdminProjectOverviewItem }) {
  const progress = calculateReportSubmissionRate(
    project.submittedReportCount,
    project.reportCount,
  );
  const status = teamStatusPresentation[project.status];
  const reportScheduleAvailable = hasReportSchedule(project.reportCount);
  const needsAttention = projectNeedsAttention(project);

  return (
    <li className={`grid gap-4 border-t border-[var(--line)] px-4 py-5 first:border-t-0 sm:px-5 xl:grid-cols-[minmax(0,1fr)_9rem_auto] xl:items-center 2xl:grid-cols-[minmax(0,1.5fr)_9rem_minmax(10rem,0.7fr)_auto] ${needsAttention ? "border-l-2 border-l-[var(--danger)]" : ""}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words font-bold tracking-[-0.02em]">{project.name}</h3>
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
      <Link
        href={`/teams/${project.id}`}
        className="button-secondary justify-self-start xl:col-start-3 xl:row-start-1 xl:justify-self-end 2xl:col-start-4"
      >
        <UiText>{"프로젝트 열기"}</UiText>
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
            <h4 className="text-sm font-black"><UiText>{selectedFilter.label}</UiText></h4>
            <p className="text-xs font-bold text-[var(--muted)]">
              <strong className="text-[var(--ink)]">{filteredProjects.length}</strong><UiText>{"개"}</UiText>
            </p>
          </div>
          {pageProjects.length > 0 ? (
            <ol>
              {pageProjects.map((project) => <ProjectRow key={project.id} project={project} />)}
            </ol>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-bold text-[var(--ink)]"><UiText>{"해당 진행 구간의 프로젝트가 없습니다."}</UiText></p>
              <Link href={adminProjectOverviewHref({ programId: program.id })} className="button-secondary mt-4">
                <UiText>{"전체 프로젝트 보기"}</UiText>
              </Link>
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
        <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
          <UiText>{"이 프로그램에는 아직 운영 중인 프로젝트가 없습니다."}</UiText>
        </p>
      )}
    </section>
  );
}

type ProgramGroup = {
  id: "active" | "closed";
  label: string;
  programs: AdminProjectOverviewProgram[];
};

function ProgramNavigation({ groups, selectedProgramId, idPrefix, ariaLabel = "프로그램 선택" }: {
  groups: ProgramGroup[];
  selectedProgramId?: string;
  idPrefix: string;
  ariaLabel?: string;
}) {
  return (
    <UiNav aria-label={ariaLabel}>
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`admin-project-group-${idPrefix}-${group.id}`} className="border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
            <h3 id={`admin-project-group-${idPrefix}-${group.id}`} className="flex items-center gap-2 px-2 py-1 text-sm font-black">
              <span className={`size-2 rounded-full ${group.id === "active" ? "bg-[var(--primary)]" : "bg-[var(--line-strong)]"}`} />
              <UiText>{group.label}</UiText>
            </h3>
            {group.programs.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {group.programs.map((program) => {
                  const selected = program.id === selectedProgramId;
                  return (
                    <li key={program.id}>
                      <Link
                        href={`/dashboard?programId=${encodeURIComponent(program.id)}`}
                        aria-current={selected ? "page" : undefined}
                        className={`relative flex min-h-[4.25rem] items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors ${
                          selected
                            ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]"
                            : "hover:bg-[var(--surface-subtle)]"
                        }`}
                      >
                        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-white text-[var(--primary)]">
                          <ProgramIcon icon={program.icon} className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <strong className="block break-words text-sm font-black leading-5"><UiText>{program.name}</UiText></strong>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--muted)]">
                            {program.startYear} · <UiText>{program.category}</UiText> · {program.projects.length}<UiText>{"개"}</UiText>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-2 py-3 text-sm text-[var(--muted)]">
                <UiText>{group.id === "active" ? "진행 중인 프로그램이 없습니다." : "종료된 프로그램이 없습니다."}</UiText>
              </p>
            )}
          </section>
        ))}
      </div>
    </UiNav>
  );
}

function AdminProjectSidebar({
  programs,
  selectedProgramId,
}: {
  programs: AdminProjectOverviewProgram[];
  selectedProgramId?: string;
}) {
  const groups: ProgramGroup[] = [
    {
      id: "active",
      label: "진행 중",
      programs: programs.filter(({ status }) => status !== "CLOSED"),
    },
    {
      id: "closed",
      label: "종료",
      programs: programs.filter(({ status }) => status === "CLOSED"),
    },
  ];
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);

  return (
    <UiAside aria-label="프로젝트 현황 선택" className="min-w-0 border-b border-[var(--line)] bg-white xl:min-h-screen xl:border-b-0 xl:border-r">
      <details className="group xl:hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"프로그램 선택"}</UiText></span>
            <strong className="mt-1 block break-words text-sm"><UiText>{selectedProgram?.name ?? "등록된 프로그램 없음"}</UiText></strong>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
        </summary>
        <div className="max-h-[60vh] overflow-y-auto border-t border-[var(--line)] px-5 py-4 sm:px-8">
          <ProgramNavigation groups={groups} selectedProgramId={selectedProgramId} idPrefix="mobile" ariaLabel="프로그램 선택 모바일" />
        </div>
      </details>
      <div className="hidden px-3 py-8 xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto">
        <div className="mb-4 px-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"관리자"}</UiText></p>
          <h2 className="mt-1 text-base font-black tracking-[-0.02em]"><UiText>{"프로젝트 현황"}</UiText></h2>
        </div>
        <ProgramNavigation groups={groups} selectedProgramId={selectedProgramId} idPrefix="desktop" />
      </div>
    </UiAside>
  );
}

export function AdminProjectOverview({
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
  const defaultProgram = programs.find(({ status }) => status !== "CLOSED")
    ?? programs[0];
  const selectedProgramId = programs.some(({ id }) => id === requestedProgramId)
    ? requestedProgramId
    : defaultProgram?.id;
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);

  return (
    <main className="min-h-[calc(100vh-4.5rem)] lg:min-h-screen">
      <div className="grid w-full xl:grid-cols-[17rem_minmax(0,1fr)]">
        <AdminProjectSidebar
          programs={programs}
          selectedProgramId={selectedProgramId}
        />
        <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12 2xl:px-14">
          <header className="border-b border-[var(--line)] pb-7">
            <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.035em]"><UiText>{"프로젝트 현황"}</UiText></h1>
            <p className="mt-2 max-w-3xl text-[0.9375rem] leading-6 text-[var(--muted)]">
              <UiText>{"프로그램별 프로젝트를 확인하고 필수 보고서 제출 기준의 진행률을 비교합니다."}</UiText>
            </p>
          </header>
          <div className="pt-7">
            {selectedProgram ? (
              <ProgramSection
                program={selectedProgram}
                sectionId="selected"
                selectedProgress={selectedProgress}
                requestedPage={requestedPage}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--muted)]">
                <UiText>{"등록된 프로그램이 없습니다."}</UiText>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
