"use client";

import { useActionState, useState } from "react";

import {
  assignAdvisorTeamsAction,
  registerAdvisorAction,
  reissueAdvisorTokenAction,
  revokeAdvisorTokenAction,
  type AdvisorActionState,
} from "@/app/admin/programs/_actions/advisor-actions";
import type { AdvisorScoreMatrixRow, ProgramAdvisorRow, ProgramTopicForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { FormField, FormSection, TextInput } from "@/shared/ui/form-system";

const idleState: AdvisorActionState = { status: "idle", message: "" };

const TEAM_STATUS_LABELS: Record<string, string> = {
  FORMING: "팀 구성 중",
  CONFIRMED: "팀 확정",
  CLOSED: "팀 종료",
};

type ProgramAdvisorPanelProps = {
  programId: string;
  advisors: ProgramAdvisorRow[];
  topics: ProgramTopicForAssignment[];
  matrix: AdvisorScoreMatrixRow[];
};

export function ProgramAdvisorPanel({ programId, advisors, topics, matrix }: ProgramAdvisorPanelProps) {
  return (
    <div className="grid gap-4">
      <RegisterSection programId={programId} />
      <FormSection title="자문위원 목록" description="발급한 초대 링크의 만료 상태를 확인하고 재발급하거나 회수합니다.">
        {advisors.length === 0 ? (
          <p role="status" className="rounded-xl border border-dashed border-[var(--line-strong)] bg-white p-6 text-center text-sm text-[var(--muted)]"><UiText>{"등록된 자문위원이 없습니다."}</UiText></p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
            {advisors.map((advisor) => <AdvisorRow key={advisor.userId} programId={programId} advisor={advisor} />)}
          </ul>
        )}
      </FormSection>
      <FormSection title="팀 할당" description="자문위원별로 이 프로그램에서 담당할 프로젝트를 선택합니다. 팀이 없는 프로젝트는 선택할 수 없습니다.">
        {advisors.length === 0 ? (
          <p role="status" className="text-sm text-[var(--muted)]"><UiText>{"자문위원을 먼저 등록해 주세요."}</UiText></p>
        ) : topics.length === 0 ? (
          <p role="status" className="text-sm text-[var(--muted)]"><UiText>{"이 프로그램에 등록된 프로젝트가 없습니다."}</UiText></p>
        ) : (
          <div className="grid gap-3">
            {advisors.map((advisor) => <AssignmentForm key={advisor.userId} programId={programId} advisor={advisor} topics={topics} />)}
          </div>
        )}
      </FormSection>
      <FormSection title="점수 집계" description="자문위원이 채점한 팀별 총점과 평균을 확인합니다.">
        <ScoreMatrix matrix={matrix} />
      </FormSection>
    </div>
  );
}

function ActionResult({ state }: { state: AdvisorActionState }) {
  if (state.status === "idle") return null;
  return (
    <div className="grid gap-2">
      <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger,#dc2626)]" : "text-[var(--primary)]"}`}>
        <UiText>{state.message}</UiText>
      </p>
      {state.inviteLink ? <InviteLinkBox inviteLink={state.inviteLink} /> : null}
    </div>
  );
}

function InviteLinkBox({ inviteLink }: { inviteLink: string }) {
  const [copied, setCopied] = useState(false);
  const absoluteLink = `${window.location.origin}${inviteLink}`;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
      <code className="min-w-0 break-all text-sm font-semibold">{absoluteLink}</code>
      <button
        type="button"
        className="button-secondary text-sm"
        onClick={() => navigator.clipboard.writeText(absoluteLink).then(() => setCopied(true))}
      >
        <UiText>{copied ? "복사됨" : "링크 복사"}</UiText>
      </button>
    </div>
  );
}

function RegisterSection({ programId }: { programId: string }) {
  const [state, action, pending] = useActionState(registerAdvisorAction, idleState);
  return (
    <FormSection title="자문위원 등록" description="이름과 이메일을 등록하면 초대 링크가 발급됩니다. 링크를 복사해 자문위원에게 전달하세요.">
      <form action={action} aria-busy={pending} className="grid gap-4">
        <input type="hidden" name="programId" value={programId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="advisor-register-name" label="이름" required>
            <TextInput id="advisor-register-name" name="name" maxLength={100} required />
          </FormField>
          <FormField id="advisor-register-email" label="이메일" required>
            <TextInput id="advisor-register-email" name="email" type="email" required />
          </FormField>
        </div>
        <div>
          <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "등록 중" : "자문위원 등록"}</UiText></button>
        </div>
        <ActionResult state={state} />
      </form>
    </FormSection>
  );
}

function AdvisorRow({ programId, advisor }: { programId: string; advisor: ProgramAdvisorRow }) {
  const [reissueState, reissueAction, reissuePending] = useActionState(reissueAdvisorTokenAction, idleState);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeAdvisorTokenAction, idleState);
  return (
    <li className="grid gap-3 border-t border-[var(--line)] px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-[var(--ink)]">{advisor.name}</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{advisor.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${advisor.activeToken ? "bg-[var(--primary-subtle)] text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>
            {advisor.activeToken ? (
              <><UiText>{"만료 "}</UiText><UiDate value={advisor.activeToken.expiresAt} mode="dateTime" /></>
            ) : (
              <UiText>{"회수됨/없음"}</UiText>
            )}
          </span>
          <form action={reissueAction}>
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="userId" value={advisor.userId} />
            <button type="submit" className="button-secondary text-sm" disabled={reissuePending}><UiText>{reissuePending ? "재발급 중" : "링크 재발급"}</UiText></button>
          </form>
          <form action={revokeAction}>
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="userId" value={advisor.userId} />
            <button type="submit" className="button-quiet text-sm" disabled={revokePending || !advisor.activeToken}><UiText>{revokePending ? "회수 중" : "회수"}</UiText></button>
          </form>
        </div>
      </div>
      <ActionResult state={reissueState} />
      <ActionResult state={revokeState} />
    </li>
  );
}

function AssignmentForm({ programId, advisor, topics }: { programId: string; advisor: ProgramAdvisorRow; topics: ProgramTopicForAssignment[] }) {
  const [state, action, pending] = useActionState(assignAdvisorTeamsAction, idleState);
  const assigned = new Set(advisor.assignedTopicIds);
  return (
    <details className="group rounded-xl border border-[var(--line)] bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4">
        <span className="min-w-0">
          <strong className="font-bold text-[var(--ink)]">{advisor.name}</strong>
          <span className="ml-2 text-sm text-[var(--muted)]">{advisor.email}</span>
        </span>
        <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          <UiText>{`담당 ${advisor.assignedTopicIds.length}팀`}</UiText>
        </span>
      </summary>
      <form action={action} aria-busy={pending} className="grid gap-3 border-t border-[var(--line)] px-5 py-4">
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="userId" value={advisor.userId} />
        <ul className="grid gap-2">
          {topics.map((topic) => {
            const disabled = !topic.team;
            return (
              <li key={topic.id}>
                <label className={`flex items-start gap-2.5 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm ${disabled ? "opacity-60" : "cursor-pointer hover:border-[var(--line-strong)]"}`}>
                  <input type="checkbox" name="topicIds" value={topic.id} defaultChecked={assigned.has(topic.id)} disabled={disabled} className="mt-0.5" />
                  {disabled && assigned.has(topic.id) ? <input type="hidden" name="topicIds" value={topic.id} /> : null}
                  <span className="min-w-0">
                    <strong className="block font-semibold text-[var(--ink)]"><UiText>{topic.title}</UiText></strong>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {topic.team ? (
                        <UiText>{`${topic.team.name} · ${TEAM_STATUS_LABELS[topic.team.status] ?? topic.team.status}`}</UiText>
                      ) : (
                        <UiText>{"팀 미구성"}</UiText>
                      )}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div>
          <button type="submit" className="button-primary text-sm" disabled={pending}><UiText>{pending ? "저장 중" : "할당 저장"}</UiText></button>
        </div>
        <ActionResult state={state} />
      </form>
    </details>
  );
}

function ScoreMatrix({ matrix }: { matrix: AdvisorScoreMatrixRow[] }) {
  const advisorColumns = new Map<string, string>();
  for (const row of matrix) for (const score of row.scores) advisorColumns.set(score.advisorId, score.advisorName);
  if (matrix.length === 0 || advisorColumns.size === 0) {
    return <p role="status" className="rounded-xl border border-dashed border-[var(--line-strong)] bg-white p-6 text-center text-sm text-[var(--muted)]"><UiText>{"아직 채점한 자문위원이 없습니다."}</UiText></p>;
  }
  const columns = [...advisorColumns.entries()];
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-left">
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"팀"}</UiText></th>
            {columns.map(([advisorId, advisorName]) => (
              <th key={advisorId} scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">{advisorName}</th>
            ))}
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]"><UiText>{"평균"}</UiText></th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => {
            const scoreByAdvisor = new Map(row.scores.map((score) => [score.advisorId, score.total]));
            return (
              <tr key={row.teamId} className="border-t border-[var(--line)] first:border-t-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-[var(--ink)]">{row.teamName}</th>
                {columns.map(([advisorId]) => (
                  <td key={advisorId} className="px-4 py-3 text-right tabular-nums">{scoreByAdvisor.has(advisorId) ? scoreByAdvisor.get(advisorId) : "–"}</td>
                ))}
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--primary)]">{row.average === null ? "–" : row.average.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
