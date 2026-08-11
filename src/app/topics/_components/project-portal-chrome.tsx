import type { ReactNode } from "react";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

export function ProjectPortalHero({ view, program, search, action }: {
  view: "active" | "past";
  program?: {
    id?: string;
    name: string;
    category: string;
    description?: string;
    startsAt?: Date | string;
    endsAt?: Date | string;
    projectRegistrationStartsAt?: Date | string;
    projectRegistrationEndsAt?: Date | string;
    recruitmentStartsAt?: Date | string;
    recruitmentEndsAt?: Date | string;
    executionStartsAt?: Date | string;
    executionEndsAt?: Date | string;
    submissionStartsAt?: Date | string;
    submissionEndsAt?: Date | string;
    votingPolicy?: { startsAt: Date | string; endsAt: Date | string } | null;
  };
  search?: ReactNode;
  action?: ReactNode;
}) {
  const title = program?.name ?? (view === "past" ? "지난 프로젝트" : "전체 프로젝트");
  const description = program?.description ?? (view === "past" ? "완료된 프로젝트와 결과물을 확인하세요." : "현재 참여할 수 있는 프로젝트를 확인하세요.");

  if (program && program.startsAt && program.endsAt) {
    const { startsAt, endsAt } = program;
    return (
      <ExplorerHero
        title={<UiText>{title}</UiText>}
        details={
          <details className="group -my-1">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
              <UiText>{"프로그램 정보"}</UiText>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </summary>
            <div className="mt-2.5 grid gap-3.5">
              <ProgramPeriods
                startsAt={startsAt}
                endsAt={endsAt}
                projectRegistrationStartsAt={program.projectRegistrationStartsAt}
                projectRegistrationEndsAt={program.projectRegistrationEndsAt}
                recruitmentStartsAt={program.recruitmentStartsAt}
                recruitmentEndsAt={program.recruitmentEndsAt}
                executionStartsAt={program.executionStartsAt}
                executionEndsAt={program.executionEndsAt}
                submissionStartsAt={program.submissionStartsAt}
                submissionEndsAt={program.submissionEndsAt}
                votingPolicy={program.votingPolicy}
              />
            </div>
          </details>
        }
        action={search || action ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">{search}{action}</div> : undefined}
      />
    );
  }

  return (
    <ExplorerHero
      title={<UiText>{title}</UiText>}
      description={<UiText>{description}</UiText>}
      context={program?.category ? <UiText>{program.category}</UiText> : undefined}
      action={search || action ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">{search}{action}</div> : undefined}
    />
  );
}

function ProgramPeriods({ startsAt, endsAt, projectRegistrationStartsAt, projectRegistrationEndsAt, recruitmentStartsAt, recruitmentEndsAt, executionStartsAt, executionEndsAt, submissionStartsAt, submissionEndsAt, votingPolicy }: {
  startsAt: Date | string;
  endsAt: Date | string;
  projectRegistrationStartsAt?: Date | string;
  projectRegistrationEndsAt?: Date | string;
  recruitmentStartsAt?: Date | string;
  recruitmentEndsAt?: Date | string;
  executionStartsAt?: Date | string;
  executionEndsAt?: Date | string;
  submissionStartsAt?: Date | string;
  submissionEndsAt?: Date | string;
  votingPolicy?: { startsAt: Date | string; endsAt: Date | string } | null;
}) {
  return (
    <dl className="grid gap-1.5 text-xs sm:text-sm">
      <ProgramPeriod label="운영 기간" startsAt={startsAt} endsAt={endsAt} />
      <ProgramPeriod
        label="프로젝트 등록 기간"
        startsAt={projectRegistrationStartsAt ?? startsAt}
        endsAt={projectRegistrationEndsAt ?? endsAt}
      />
      {recruitmentStartsAt && recruitmentEndsAt ? <ProgramPeriod label="프로젝트 모집 기간" startsAt={recruitmentStartsAt} endsAt={recruitmentEndsAt} /> : null}
      {executionStartsAt && executionEndsAt ? <ProgramPeriod label="수행 기간" startsAt={executionStartsAt} endsAt={executionEndsAt} /> : null}
      {submissionStartsAt && submissionEndsAt ? <ProgramPeriod label="제출 기간" startsAt={submissionStartsAt} endsAt={submissionEndsAt} /> : null}
      {votingPolicy ? (
        <ProgramPeriod label="투표 기간" startsAt={votingPolicy.startsAt} endsAt={votingPolicy.endsAt} />
      ) : null}
    </dl>
  );
}

function ProgramPeriod({ label, startsAt, endsAt }: {
  label: string;
  startsAt: Date | string;
  endsAt: Date | string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-x-3">
      <dt className="font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className="min-w-0 font-semibold text-[var(--ink)]">
        <UiDate value={startsAt} mode="dateTime" />
        <span aria-hidden="true"> – </span>
        <UiDate value={endsAt} mode="dateTime" />
      </dd>
    </div>
  );
}
