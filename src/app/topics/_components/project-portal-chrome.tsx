import Link from "next/link";
import type { ReactNode } from "react";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

const phaseLabel: Record<PublicTopicPhase, string> = {
  ACTIVE: "전체",
  RECRUITING: "모집 중",
  CLOSING_SOON: "마감 임박",
};

export function ProjectPortalHero({ view, program, action }: {
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
    recruitmentEndsAt?: Date | string;
    votingPolicy?: { startsAt: Date | string; endsAt: Date | string } | null;
  };
  action?: ReactNode;
}) {
  const title = program?.name ?? (view === "past" ? "지난 프로젝트" : "전체 프로젝트");
  const description = program?.description ?? (view === "past" ? "완료된 프로젝트와 결과물을 확인하세요." : "현재 참여할 수 있는 프로젝트를 확인하세요.");
  return (
    <ExplorerHero
      title={<UiText>{title}</UiText>}
      details={program?.startsAt && program.endsAt ? (
        <ProgramPeriods
          startsAt={program.startsAt}
          endsAt={program.endsAt}
          projectRegistrationStartsAt={program.projectRegistrationStartsAt}
          projectRegistrationEndsAt={program.projectRegistrationEndsAt}
          recruitmentEndsAt={program.recruitmentEndsAt}
          votingPolicy={program.votingPolicy}
        />
      ) : undefined}
      description={<UiText>{description}</UiText>}
      context={program?.category ? <UiText>{program.category}</UiText> : undefined}
      action={action}
    />
  );
}

function ProgramPeriods({ startsAt, endsAt, projectRegistrationStartsAt, projectRegistrationEndsAt, recruitmentEndsAt, votingPolicy }: {
  startsAt: Date | string;
  endsAt: Date | string;
  projectRegistrationStartsAt?: Date | string;
  projectRegistrationEndsAt?: Date | string;
  recruitmentEndsAt?: Date | string;
  votingPolicy?: { startsAt: Date | string; endsAt: Date | string } | null;
}) {
  return (
    <details className="group -my-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
        <UiText>{"기간 정보"}</UiText>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <dl className="mt-2 grid gap-1.5 text-xs sm:text-sm">
        <ProgramPeriod label="운영 기간" startsAt={startsAt} endsAt={endsAt} />
        <ProgramPeriod
          label="프로젝트 등록 기간"
          startsAt={projectRegistrationStartsAt ?? startsAt}
          endsAt={projectRegistrationEndsAt ?? endsAt}
        />
        {recruitmentEndsAt ? <ProgramDeadline label="프로젝트 모집 마감" endsAt={recruitmentEndsAt} /> : null}
        {votingPolicy ? (
          <ProgramPeriod label="투표 기간" startsAt={votingPolicy.startsAt} endsAt={votingPolicy.endsAt} />
        ) : null}
      </dl>
    </details>
  );
}

function ProgramDeadline({ label, endsAt }: { label: string; endsAt: Date | string }) {
  return (
    <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-x-3">
      <dt className="font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className="min-w-0 font-semibold text-[var(--ink)]"><UiDate value={endsAt} mode="dateTime" /></dd>
    </div>
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

export function ProjectStatusNavigation({ phase, counts, programId, query, sort }: { phase: PublicTopicPhase; counts: PublicTopicPage["counts"]; programId?: string; query?: string; sort?: PublicTopicSort }) {
  const activeUrl = (item: PublicTopicPhase) => {
    const params = new URLSearchParams({ phase: item });
    if (programId) params.set("programId", programId);
    if (query) params.set("q", query);
    if (sort === "DEADLINE") params.set("sort", sort);
    return `/topics?${params.toString()}`;
  };
  return (
    <UiNav aria-label="프로젝트 상태" className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(Object.keys(phaseLabel) as PublicTopicPhase[]).map((item) => {
        const selected = phase === item;
        return <Link key={item} href={activeUrl(item)} aria-current={selected ? "page" : undefined} className={`flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"}`}>{phaseLabel[item]} <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ${selected ? "bg-white text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>{counts[item]}</span></Link>;
      })}
    </UiNav>
  );
}
