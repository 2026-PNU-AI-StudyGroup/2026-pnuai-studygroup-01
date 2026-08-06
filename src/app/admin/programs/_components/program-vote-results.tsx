"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { ProgramVotingResults } from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function ProgramVoteResults({ results, refreshedAt }: { results: ProgramVotingResults; refreshedAt: string }) {
  const router = useRouter();
  useEffect(() => {
    if (results.phase !== "OPEN") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [results.phase, router]);

  if (results.phase === "UPCOMING") {
    return <p role="status" className="rounded-xl border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]"><UiText>{"투표가 시작되면 득표현황을 실시간으로 확인할 수 있습니다."}</UiText></p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="상태" value={results.phase === "OPEN" ? "투표 진행 중" : "최종 결과"} />
        <Summary label="총 선택 수" value={`${results.totalVotes}표`} />
        <Summary label="참여자 수" value={`${results.participantCount}명`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <p><UiText>{results.policy.identityVisibility === "NAMED" ? "기명 집계: 사용자별 선택 내역을 표시합니다." : "익명 집계: 사용자별 선택 내역을 표시하지 않습니다."}</UiText></p>
        <p><UiText>{`마지막 갱신 ${refreshedAt}`}</UiText></p>
      </div>
      {results.results.length ? <ol className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        {results.results.map((result) => (
          <li key={result.topicId} className="border-t border-[var(--line)] p-5 first:border-t-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--primary)]"><UiText>{`${result.rank}위`}</UiText></p>
                <h2 className="mt-1 text-lg font-bold">{result.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{result.description}</p>
              </div>
              <strong className="rounded-full bg-[var(--primary-subtle)] px-3 py-1.5 text-sm text-[var(--primary)]">{result.voteCount}<UiText>{"표"}</UiText></strong>
            </div>
            {results.policy.identityVisibility === "NAMED" && result.voters.length ? (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${result.title} 투표자`}>
                {result.voters.map((voter) => <li key={voter.id} className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]">{voter.name} · {voter.email}</li>)}
              </ul>
            ) : null}
          </li>
        ))}
      </ol> : <p role="status" className="rounded-xl border border-dashed border-[var(--line-strong)] bg-white p-6 text-center text-sm text-[var(--muted)]"><UiText>{"공개 이력이 있는 투표 후보 프로젝트가 없습니다."}</UiText></p>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <dl className="rounded-xl border border-[var(--line)] bg-white p-4"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="mt-1 text-xl font-bold">{value}</dd></dl>;
}
