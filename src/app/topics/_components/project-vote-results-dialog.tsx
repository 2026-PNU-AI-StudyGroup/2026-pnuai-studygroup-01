"use client";

import { useId, useRef, useState } from "react";

import type {
  ProgramVoteResult,
  PublicProgramVoteResult,
  VotingResultsView,
} from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { AutoRefresh } from "@/shared/ui/auto-refresh";
import { EmptyState } from "@/shared/ui/page-primitives";
import { BarChartIcon, CloseIcon } from "@/shared/ui/workspace-icons";

type ResultView = "overall" | "division";

export function ProjectVoteResultsDialog({ view: resultsView, triggerLabel = "투표 결과" }: {
  view: VotingResultsView;
  triggerLabel?: string;
}) {
  const results = resultsView.results;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<ResultView>("overall");
  // 열려 있는 동안만 서버 데이터를 다시 읽는다. 닫아 두고 계속 조회하면 낭비다.
  const [open, setOpen] = useState(false);
  const sortedResults = sortByVotes(results.results);
  const divisionGroups = groupByDivision(results.results);
  const votersByTopic = resultsView.mode === "ADMIN"
    ? new Map(resultsView.results.results.map((result) => [result.topicId, result.voters]))
    : null;

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
        className="button-secondary min-h-8 gap-1.5 px-3 py-1.5 text-xs"
      >
        <BarChartIcon className="size-4 shrink-0" />
        <UiText>{triggerLabel}</UiText>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="project-vote-results-title"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus({ preventScroll: true });
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--surface)] p-0 text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.22)] backdrop:bg-[var(--backdrop)]"
      >
        {open ? <AutoRefresh intervalMs={10_000} /> : null}
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 pr-16 sm:px-7 sm:py-6 sm:pr-20">
          <p className="text-xs font-bold text-[var(--primary)]"><UiText>{results.programName}</UiText></p>
          <h2 id="project-vote-results-title" className="mt-1 text-2xl font-bold tracking-[-0.035em]">
            <UiText>{"투표 결과"}</UiText>
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <UiText>{`총 ${results.totalVotes}표 · 후보 프로젝트 ${results.results.length}개`}</UiText>
          </p>
          <button
            type="button"
            onClick={close}
            aria-label={"투표 결과 닫기"}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] sm:right-5 sm:top-5"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>

        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div role="group" aria-label={"투표 결과 정렬"} className="mb-4 inline-flex rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-1">
            <ViewButton selected={view === "overall"} onClick={() => setView("overall")}>
              {"전체 득표순"}
            </ViewButton>
            <ViewButton selected={view === "division"} onClick={() => setView("division")}>
              {"분과별 득표순"}
            </ViewButton>
          </div>

          {results.results.length === 0 ? (
            <EmptyState variant="section" title="투표 후보 프로젝트가 없습니다" description="공개된 후보 프로젝트가 생기면 이곳에 표시됩니다." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                <thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold"><UiText>{"프로젝트명"}</UiText></th>
                    <th scope="col" className="px-4 py-3 font-bold"><UiText>{"분과"}</UiText></th>
                    <th scope="col" className="px-4 py-3 font-bold"><UiText>{"팀명"}</UiText></th>
                    <th scope="col" className="w-24 px-4 py-3 text-right font-bold"><UiText>{"득표수"}</UiText></th>
                  </tr>
                </thead>
                <tbody>
                  {view === "overall"
                    ? sortedResults.map((result) => <ResultRow key={result.topicId} result={result} voters={votersByTopic?.get(result.topicId)} />)
                    : divisionGroups.map((group) => (
                      <DivisionRows key={group.key} name={group.name} results={group.results} votersByTopic={votersByTopic} />
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

function ViewButton({ selected, onClick, children }: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
        selected
          ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      <UiText>{children}</UiText>
    </button>
  );
}

function DivisionRows({ name, results, votersByTopic }: {
  name: string;
  results: PublicProgramVoteResult[];
  votersByTopic: Map<string, ProgramVoteResult["voters"]> | null;
}) {
  return (
    <>
      <tr className="border-t border-[var(--line)] bg-[var(--primary-subtle)] first:border-t-0">
        <th colSpan={4} scope="rowgroup" className="px-4 py-2.5 text-xs font-bold text-[var(--primary)]">
          <UiText>{name === "미분과" ? name : `${name} 분과`}</UiText>
        </th>
      </tr>
      {results.map((result) => <ResultRow key={result.topicId} result={result} voters={votersByTopic?.get(result.topicId)} />)}
    </>
  );
}

function ResultRow({ result, voters }: { result: PublicProgramVoteResult; voters?: ProgramVoteResult["voters"] }) {
  const [expanded, setExpanded] = useState(false);
  const votersId = useId();
  if (!voters) {
    return (
      <tr className="border-t border-[var(--line)] first:border-t-0">
        <th scope="row" className="px-4 py-3 font-semibold text-[var(--ink)]"><UiText>{result.title}</UiText></th>
        <td className="px-4 py-3 text-[var(--muted)]"><UiText>{result.divisionName ?? "미분과"}</UiText></td>
        <td className="px-4 py-3 text-[var(--muted)]"><UiText>{result.teamName ?? "팀 미구성"}</UiText></td>
        <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--primary)]">{result.voteCount}<UiText>{"표"}</UiText></td>
      </tr>
    );
  }
  return (
    <>
      <tr className="border-t border-[var(--line)] first:border-t-0">
        <th scope="row" className="px-4 py-3 font-semibold text-[var(--ink)]">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={votersId}
            onClick={() => setExpanded((value) => !value)}
            className="group inline-flex min-h-8 items-center gap-2 text-left hover:text-[var(--primary)]"
          >
            <UiText>{result.title}</UiText>
            <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 shrink-0 fill-none stroke-current stroke-[1.8] transition-transform ${expanded ? "rotate-180" : ""}`}>
              <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </th>
        <td className="px-4 py-3 text-[var(--muted)]"><UiText>{result.divisionName ?? "미분과"}</UiText></td>
        <td className="px-4 py-3 text-[var(--muted)]"><UiText>{result.teamName ?? "팀 미구성"}</UiText></td>
        <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--primary)]">{result.voteCount}<UiText>{"표"}</UiText></td>
      </tr>
      {expanded ? (
        <tr id={votersId} className="border-t border-[var(--line)] bg-[var(--surface-subtle)]">
          <td colSpan={4} className="px-4 py-4">
            <VoterTable voters={voters} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function VoterTable({ voters }: { voters: ProgramVoteResult["voters"] }) {
  if (!voters.length) {
    return <EmptyState variant="compact" title="이 프로젝트에 투표한 사용자가 없습니다" />;
  }
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[var(--muted)]"><UiText>{`투표자 ${voters.length}명`}</UiText></p>
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--muted)]">
            <tr>
              <th scope="col" className="w-1/4 px-3 py-2 font-bold"><UiText>{"이름"}</UiText></th>
              <th scope="col" className="w-1/2 px-3 py-2 font-bold"><UiText>{"이메일"}</UiText></th>
              <th scope="col" className="w-1/4 px-3 py-2 font-bold"><UiText>{"역할"}</UiText></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {voters.map((voter) => (
              <tr key={voter.id}>
                <td className="px-3 py-2 font-semibold"><UiText>{voter.name}</UiText></td>
                <td className="break-all px-3 py-2 text-[var(--muted)]">{voter.email}</td>
                <td className="px-3 py-2 text-[var(--muted)]"><UiText>{roleLabel(voter.role)}</UiText></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function roleLabel(role: ProgramVoteResult["voters"][number]["role"]) {
  if (role === "ADMIN") return "관리자";
  if (role === "PROFESSOR") return "교수";
  if (role === "ADVISOR") return "자문위원";
  return "학생";
}

function sortByVotes(results: PublicProgramVoteResult[]) {
  return [...results].sort((left, right) => (
    right.voteCount - left.voteCount || left.title.localeCompare(right.title, "ko")
  ));
}

function groupByDivision(results: PublicProgramVoteResult[]) {
  const groups = new Map<string, {
    key: string;
    name: string;
    position: number;
    results: PublicProgramVoteResult[];
  }>();
  for (const result of results) {
    const key = result.divisionId ?? "UNASSIGNED";
    const group = groups.get(key) ?? {
      key,
      name: result.divisionName ?? "미분과",
      position: result.divisionPosition ?? Number.MAX_SAFE_INTEGER,
      results: [],
    };
    group.results.push(result);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((left, right) => left.position - right.position || left.name.localeCompare(right.name, "ko"))
    .map((group) => ({ ...group, results: sortByVotes(group.results) }));
}
