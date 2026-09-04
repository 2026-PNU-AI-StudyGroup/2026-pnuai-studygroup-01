"use client";

import { useActionState, useState } from "react";

import {
  assignAdvisorTeamsAction,
  registerAdvisorAction,
  reissueAdvisorTokenAction,
  revokeAdvisorTokenAction,
  type AdvisorActionState,
} from "@/app/topics/_management/advisor-actions";
import styles from "@/app/topics/_management/program-management.module.css";
import type { AdvisorScoreMatrixRow, ProgramAdvisorRow, ProgramTopicForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, FormField, TextInput } from "@/shared/ui/form-system";

const idleState: AdvisorActionState = { status: "idle", message: "" };

type ProgramAdvisorPanelProps = {
  programId: string;
  advisors: ProgramAdvisorRow[];
  topics: ProgramTopicForAssignment[];
  matrix: AdvisorScoreMatrixRow[];
};

export function ProgramAdvisorPanel({ programId, advisors, topics, matrix }: ProgramAdvisorPanelProps) {
  return (
    <div className={styles.form}>
      <RegisterSection programId={programId} />
      <section className={styles.section}>
        <SectionHeader title="자문위원 목록" description="이 프로그램에 초대한 위원만 나옵니다." />
        {advisors.length === 0 ? (
          <p role="status" className="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]"><UiText>{"이 프로그램에 초대한 자문위원이 없습니다."}</UiText></p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {advisors.map((advisor) => <AdvisorRow key={advisor.userId} programId={programId} advisor={advisor} />)}
          </ul>
        )}
      </section>
      <section className={styles.section}>
        <SectionHeader title="팀 할당" description="팀이 있는 프로젝트만 담당자로 배정할 수 있습니다." />
        {advisors.length === 0 ? (
          <p role="status" className="text-sm text-[var(--muted)]"><UiText>{"자문위원을 먼저 초대해 주세요."}</UiText></p>
        ) : topics.length === 0 ? (
          <p role="status" className="text-sm text-[var(--muted)]"><UiText>{"이 프로그램에 등록된 프로젝트가 없습니다."}</UiText></p>
        ) : (
          <div className="grid gap-3">
            {advisors.map((advisor) => <AssignmentForm key={advisor.userId} programId={programId} advisor={advisor} topics={topics} />)}
          </div>
        )}
      </section>
      <section className={styles.section}>
        <SectionHeader title="점수 집계" />
        <ScoreMatrix matrix={matrix} />
      </section>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return <header className={styles.sectionHeader}><h2><UiText>{title}</UiText></h2>{description ? <p><UiText>{description}</UiText></p> : null}</header>;
}

function ActionResult({ state }: { state: AdvisorActionState }) {
  if (state.status === "idle") return null;
  return (
    <div className="grid gap-2">
      <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger,#dc2626)]" : "text-[var(--primary)]"}`}>
        <UiText>{state.message}</UiText>
      </p>
      {/* key: 위원이 바뀌면 복사 상태를 새로 시작해 이전 위원 토큰이 남지 않도록 재마운트한다. */}
      {state.inviteLink ? <InviteLinkBox key={state.inviteLink} inviteLink={state.inviteLink} /> : null}
    </div>
  );
}

function InviteLinkBox({ inviteLink }: { inviteLink: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const absoluteLink = `${window.location.origin}${inviteLink}`;
  const copy = async () => {
    try {
      // secure context 밖에서는 navigator.clipboard 자체가 없다.
      await navigator.clipboard.writeText(absoluteLink);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };
  return (
    <div className="grid gap-1.5 rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 break-all text-sm font-semibold">{absoluteLink}</code>
        <button type="button" className="button-secondary text-sm" onClick={copy}>
          <UiText>{copyStatus === "copied" ? "복사됨" : "링크 복사"}</UiText>
        </button>
        <button type="button" className="button-quiet text-sm" onClick={() => setDismissed(true)}>
          <UiText>{"닫기"}</UiText>
        </button>
      </div>
      {copyStatus === "failed" ? <p role="alert" className="text-xs font-semibold text-[var(--danger,#dc2626)]"><UiText>{"복사에 실패했습니다. 링크를 직접 선택해 복사해 주세요."}</UiText></p> : null}
    </div>
  );
}

function RegisterSection({ programId }: { programId: string }) {
  const [state, action, pending] = useActionState(registerAdvisorAction, idleState);
  return (
    <section className={styles.section}>
      <SectionHeader title="자문위원 초대" description="이 프로그램의 심사에만 쓰이는 링크가 발급됩니다. 다른 프로그램에 있는 위원도 같은 이메일로 부를 수 있습니다." />
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
          <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "초대 중" : "자문위원 초대"}</UiText></button>
        </div>
        <ActionResult state={state} />
      </form>
    </section>
  );
}

function AdvisorRow({ programId, advisor }: { programId: string; advisor: ProgramAdvisorRow }) {
  // 재발급·회수를 한 상태로 묶어야 회수 뒤에도 죽은 초대 링크가 화면에 남지 않는다.
  const [state, action, pending] = useActionState(
    (previous: AdvisorActionState, formData: FormData) =>
      formData.get("intent") === "revoke"
        ? revokeAdvisorTokenAction(previous, formData)
        : reissueAdvisorTokenAction(previous, formData),
    idleState,
  );
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
              <UiText>{"링크 없음 · 재발급 필요"}</UiText>
            )}
          </span>
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="userId" value={advisor.userId} />
            <button type="submit" name="intent" value="reissue" className="button-secondary text-sm" disabled={pending}><UiText>{pending ? "처리 중" : "링크 재발급"}</UiText></button>
            <button type="submit" name="intent" value="revoke" className="button-quiet text-sm" disabled={pending}><UiText>{"초대 회수"}</UiText></button>
          </form>
        </div>
      </div>
      <ActionResult state={state} />
    </li>
  );
}

function AssignmentForm({ programId, advisor, topics }: { programId: string; advisor: ProgramAdvisorRow; topics: ProgramTopicForAssignment[] }) {
  const [state, action, pending] = useActionState(assignAdvisorTeamsAction, idleState);
  const assigned = new Set(advisor.assignedTopicIds);
  return (
    <details className="group rounded-xl border border-[var(--line)] bg-[var(--surface)]">
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
                <ChoiceCard
                  type="checkbox"
                  name="topicIds"
                  value={topic.id}
                  defaultChecked={assigned.has(topic.id)}
                  disabled={disabled}
                  className={disabled ? "opacity-60" : ""}
                  label={topic.title}
                  description={topic.team ? `${topic.team.name} · ${topic.team.confirmedAt ? "팀 확정" : "팀 구성 중"}` : "팀 미구성"}
                />
                {/* 팀이 사라진 기존 할당은 disabled 체크박스가 전송되지 않으므로 hidden으로 보존한다. */}
                {disabled && assigned.has(topic.id) ? <input type="hidden" name="topicIds" value={topic.id} /> : null}
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
    return <p role="status" className="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]"><UiText>{"아직 채점한 자문위원이 없습니다."}</UiText></p>;
  }
  const columns = [...advisorColumns.entries()];
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
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
