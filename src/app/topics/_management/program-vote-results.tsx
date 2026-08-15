"use client";

import Link from "next/link";
import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ProgramVotingResults } from "@/modules/project-voting/application/manage-project-voting";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { IconButton } from "@/shared/ui/icon-button";
import { EmptyState } from "@/shared/ui/page-primitives";
import { RefreshIcon, SettingsIcon } from "@/shared/ui/workspace-icons";

type ProgramVoteResultsProps = {
  results: ProgramVotingResults;
  refreshedAt: string;
  policySettingsHref: string;
};

export function ProgramVoteResults({ results, refreshedAt, policySettingsHref }: ProgramVoteResultsProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const refresh = useCallback(() => startRefresh(() => router.refresh()), [router, startRefresh]);

  useEffect(() => {
    if (results.phase !== "OPEN") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [refresh, results.phase]);

  const phaseLabel = results.phase === "OPEN" ? "투표 진행 중" : results.phase === "UPCOMING" ? "투표 예정" : "투표 종료";
  const scopeLabel = results.policy.voteLimitScope === "DIVISION" ? "분과별 투표" : "프로그램 전체 투표";
  const divisionGroups = results.policy.voteLimitScope === "DIVISION" ? groupResultsByDivision(results.results) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[var(--primary)]"><UiText>{phaseLabel}</UiText></p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]"><UiText>{"투표 현황"}</UiText></h2>
          <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{`${scopeLabel} · 인당 ${results.policy.voteLimit}표`}</UiText></p>
        </div>
        <div className="flex shrink-0 gap-2">
          <IconButton type="button" onClick={refresh} disabled={refreshing} aria-label={refreshing ? "새로고침 중" : "새로고침"} title="새로고침"><RefreshIcon className={`size-5 ${refreshing ? "animate-spin" : ""}`} /></IconButton>
          <Link href={policySettingsHref} className="button-secondary gap-2 text-sm"><SettingsIcon className="size-4 shrink-0" /><UiText>{"투표 정책 수정"}</UiText></Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="상태" value={phaseLabel} />
        <Summary label="총 선택 수" value={`${results.totalVotes}표`} />
        <Summary label="참여자 수" value={`${results.participantCount}명`} />
        <Summary label="후보 프로젝트" value={`${results.results.length}개`} />
      </div>

      <dl className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"투표 기간"}</UiText></dt><dd className="mt-1 font-semibold"><UiDate value={results.policy.startsAt} mode="dateTime" /> – <UiDate value={results.policy.endsAt} mode="dateTime" /></dd></div>
        <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"마지막 갱신"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{refreshedAt}</UiText></dd></div>
      </dl>

      {results.phase === "UPCOMING" ? <p role="status" className="rounded-xl border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]"><UiText>{"투표가 시작되면 득표현황을 실시간으로 확인할 수 있습니다."}</UiText></p>
        : results.results.length === 0 ? <EmptyState variant="compact" title="공개 이력이 있는 투표 후보 프로젝트가 없습니다" description="프로젝트가 공개되면 투표 후보와 득표 현황이 표시됩니다." />
          : results.policy.voteLimitScope === "DIVISION" ? <div className="space-y-4">
            {divisionGroups.map((group) => (
              <section key={group.key} aria-label={`${group.name} 득표현황`} className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-3">
                  <h3 className="text-sm font-bold"><UiText>{group.name === "미분과" ? "미분과" : `${group.name} 분과`}</UiText></h3>
                  <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{`프로젝트 ${group.results.length}개 · ${group.voteCount}표`}</UiText></p>
                </header>
                <ResultRows results={group.results} />
              </section>
            ))}
          </div> : <ResultRows className="overflow-hidden rounded-xl border border-[var(--line)] bg-white" results={results.results} />}
    </div>
  );
}

function groupResultsByDivision(results: ProgramVotingResults["results"]) {
  const groups = new Map<string, { key: string; name: string; results: ProgramVotingResults["results"]; voteCount: number }>();
  for (const result of results) {
    const key = result.divisionId ?? "UNASSIGNED";
    const current = groups.get(key) ?? { key, name: result.divisionName ?? "미분과", results: [], voteCount: 0 };
    current.results.push(result);
    current.voteCount += result.voteCount;
    groups.set(key, current);
  }
  return [...groups.values()];
}

function ResultRows({ results, className }: Pick<ProgramVotingResults, "results"> & { className?: string }) {
  return <ol className={className}>
    {results.map((result) => (
      <li key={result.topicId} className="border-t border-[var(--line)] px-5 py-4 first:border-t-0">
        <div className="grid gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center">
          <p className="text-sm font-bold text-[var(--primary)]"><UiText>{`${result.rank}위`}</UiText></p>
          <div className="min-w-0">
            <Link href={`/topics/${result.topicId}`} className="font-bold text-[var(--ink)] underline-offset-4 hover:text-[var(--primary)] hover:underline"><UiText>{result.title}</UiText></Link>
            <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]"><UiText>{result.description}</UiText></p>
          </div>
          <strong className="rounded-full bg-[var(--primary-subtle)] px-3 py-1.5 text-sm text-[var(--primary)]">{result.voteCount}<UiText>{"표"}</UiText></strong>
        </div>
        {result.voters.length ? (
          <details className="group mt-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-[var(--primary)]">
              <UiText>{`투표자 ${result.voters.length}명 보기`}</UiText>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-current stroke-[1.8] transition-transform group-open:rotate-180 [stroke-linecap:round] [stroke-linejoin:round]"><path d="m6 8 4 4 4-4" /></svg>
            </summary>
            <ul className="mt-3 flex flex-wrap gap-2">
              {result.voters.map((voter) => <li key={voter.id} className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-xs text-[var(--muted)]">{voter.name} · {voter.email} · <UiText>{roleLabel(voter.role)}</UiText></li>)}
            </ul>
          </details>
        ) : null}
      </li>
    ))}
  </ol>;
}

function roleLabel(role: ProgramVotingResults["results"][number]["voters"][number]["role"]) {
  return role === "ADMIN" ? "관리자" : role === "PROFESSOR" ? "교수" : "학생";
}

function Summary({ label, value }: { label: string; value: string }) {
  return <dl className="rounded-xl border border-[var(--line)] bg-white p-4"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="mt-1 text-xl font-bold"><UiText>{value}</UiText></dd></dl>;
}
