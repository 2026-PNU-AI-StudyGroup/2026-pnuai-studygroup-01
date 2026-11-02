"use client";

import { useActionState, useState } from "react";

import {
  assignAdvisorTeamsAction,
  resumeAdvisorAction,
  registerAdvisorAction,
  reinviteAdvisorAction,
  reissueAdvisorTokenAction,
  revokeAdvisorTokenAction,
  suspendAdvisorAction,
  type AdvisorActionState,
} from "@/app/topics/_management/advisor-actions";
import { cardClass, CardHead, Missing, Pill } from "@/modules/project-program/ui/work-screen";
import type { AdvisorScoreMatrixRow, ProgramAdvisorRow, ProgramTopicForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, FormField, TextInput } from "@/shared/ui/form-system";

const idleState: AdvisorActionState = { status: "idle", message: "" };
// 줄 안의 버튼은 내용 크기의 낮은 테두리 버튼. 회수도 같은 모양이고 결과는 확인 없이 바로 줄 아래에 적힌다.
const rowButton = "button-secondary button-compact min-h-8 px-3 font-medium";

type ProgramAdvisorPanelProps = {
  programId: string;
  advisors: ProgramAdvisorRow[];
  topics: ProgramTopicForAssignment[];
  matrix: AdvisorScoreMatrixRow[];
};

export function ProgramAdvisorPanel({ programId, advisors, topics, matrix }: ProgramAdvisorPanelProps) {
  // 회수한 위원은 심사단이 아니지만 화면에서 지우지는 않는다. 사라지면 다시 부르는 길이
  // 어디에도 없어 막힌 것처럼 보인다. 목록과 팀 할당은 지금 심사단만, 되살리기는 아래 따로.
  const serving = advisors.filter((advisor) => advisor.revokedAt === null);
  const revoked = advisors.filter((advisor) => advisor.revokedAt !== null);
  // 화면의 질문은 "누가 심사단이고 지금 들어올 수 있나"다. 목록 카드가 가장 크고, 초대는 그 머리 바로 아래 한 줄이다.
  return (
    <div className="grid gap-3.5">
      <section aria-labelledby="advisor-list-title" className={cardClass}>
        <CardHead id="advisor-list-title" title={<UiText>{"자문위원 목록"}</UiText>} count={<>{serving.length}<UiText>{"명"}</UiText></>} />
        <RegisterForm programId={programId} />
        {serving.length === 0 ? (
          <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"이 프로그램에 초대한 자문위원이 없습니다."}</UiText></p>
        ) : (
          <ul>
            {serving.map((advisor) => <AdvisorRow key={advisor.userId} programId={programId} advisor={advisor} />)}
          </ul>
        )}
      </section>
      {revoked.length > 0 ? (
        <section aria-labelledby="advisor-revoked-title" className={cardClass}>
          <CardHead id="advisor-revoked-title" title={<UiText>{"회수한 위원"}</UiText>} count={<>{revoked.length}<UiText>{"명"}</UiText></>} />
          <p className="px-5 pb-3 text-xs text-[var(--muted)]"><UiText>{"초대를 거둔 위원입니다. 다시 부르면 새 링크가 발급되고, 담당 팀은 다시 배정해야 합니다."}</UiText></p>
          <ul>
            {revoked.map((advisor) => <RevokedAdvisorRow key={advisor.userId} programId={programId} advisor={advisor} />)}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="advisor-assign-title" className={cardClass}>
        <CardHead id="advisor-assign-title" title={<UiText>{"팀 할당"}</UiText>} count={serving.length ? <UiText>{`위원 ${serving.length}명, 프로젝트 ${topics.length}개`}</UiText> : undefined} />
        <p className="px-5 pb-3 text-xs text-[var(--muted)]"><UiText>{"팀이 있는 프로젝트만 담당자로 배정할 수 있습니다."}</UiText></p>
        {serving.length === 0 ? (
          <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"자문위원을 먼저 초대해 주세요."}</UiText></p>
        ) : topics.length === 0 ? (
          <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"이 프로그램에 등록된 프로젝트가 없습니다."}</UiText></p>
        ) : (
          <div>
            {serving.map((advisor) => <AssignmentForm key={advisor.userId} programId={programId} advisor={advisor} topics={topics} />)}
          </div>
        )}
      </section>
      <section aria-labelledby="advisor-score-title" className={cardClass}>
        <CardHead id="advisor-score-title" title={<UiText>{"점수 집계"}</UiText>} count={matrix.length ? <UiText>{`팀 ${matrix.length}개`}</UiText> : undefined} />
        <ScoreMatrix matrix={matrix} />
      </section>
    </div>
  );
}

function ActionResult({ state }: { state: AdvisorActionState }) {
  if (state.status === "idle") return null;
  return (
    <div className="grid gap-2">
      <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
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
    <div className="grid gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 break-all text-sm font-semibold">{absoluteLink}</code>
        <button type="button" className="button-secondary text-sm" onClick={copy}>
          <UiText>{copyStatus === "copied" ? "복사됨" : "링크 복사"}</UiText>
        </button>
        <button type="button" className="button-quiet text-sm" onClick={() => setDismissed(true)}>
          <UiText>{"닫기"}</UiText>
        </button>
      </div>
      {copyStatus === "failed" ? <p role="alert" className="text-xs font-semibold text-[var(--danger)]"><UiText>{"복사에 실패했습니다. 링크를 직접 선택해 복사해 주세요."}</UiText></p> : null}
    </div>
  );
}

function RegisterForm({ programId }: { programId: string }) {
  const [state, action, pending] = useActionState(registerAdvisorAction, idleState);
  return (
    <form action={action} aria-busy={pending} className="grid gap-3 px-5 pb-4">
      <input type="hidden" name="programId" value={programId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,18rem)_auto] sm:items-end sm:justify-start">
        <FormField id="advisor-register-name" label="이름" required>
          <TextInput id="advisor-register-name" name="name" maxLength={100} required />
        </FormField>
        <FormField id="advisor-register-email" label="이메일" required>
          <TextInput id="advisor-register-email" name="email" type="email" required />
        </FormField>
        <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "초대 중" : "자문위원 초대"}</UiText></button>
      </div>
      <p className="text-xs text-[var(--muted)]"><UiText>{"이 프로그램의 심사에만 쓰이는 링크가 발급됩니다. 다른 프로그램에 있는 위원도 같은 이메일로 부를 수 있습니다."}</UiText></p>
      <ActionResult state={state} />
    </form>
  );
}

function AdvisorRow({ programId, advisor }: { programId: string; advisor: ProgramAdvisorRow }) {
  // 재발급·회수를 한 상태로 묶어야 회수 뒤에도 죽은 초대 링크가 화면에 남지 않는다.
  const [state, action, pending] = useActionState(
    (previous: AdvisorActionState, formData: FormData) => {
      const intent = formData.get("intent");
      if (intent === "revoke") return revokeAdvisorTokenAction(previous, formData);
      if (intent === "suspend") return suspendAdvisorAction(previous, formData);
      if (intent === "resume") return resumeAdvisorAction(previous, formData);
      return reissueAdvisorTokenAction(previous, formData);
    },
    idleState,
  );
  // 비활성 계정에는 토큰 로그인이 막혀 있어 링크를 내줘도 열리지 않는다. 서버도 거절하지만,
  // 눌러 본 뒤에야 알게 하지 말고 버튼을 먼저 막고 이유를 옆에 적는다. 회수는 그대로 둔다.
  const accountDisabled = advisor.accountStatus !== "ACTIVE";
  // 멈춘 동안에는 링크를 살려 둔다. 다시 열면 위원이 가진 그 링크가 그대로 열려야 하므로
  // 재발급으로 링크를 바꾸지 않는다.
  const suspended = advisor.suspendedAt !== null;
  return (
    <li className="grid gap-2 border-t border-[var(--line)] px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
            {advisor.name}
            {accountDisabled ? <Pill>{"계정 비활성"}</Pill> : null}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{advisor.email}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {suspended ? (
            <Pill tone="warning">{"심사 멈춤"}</Pill>
          ) : advisor.activeToken ? (
            <span className="text-xs tabular-nums text-[var(--muted)]"><UiText>{"링크 만료"}</UiText>{" "}<UiDate value={advisor.activeToken.expiresAt} mode="dateTime" /></span>
          ) : (
            <Pill tone="warning">{"링크 없음 · 재발급 필요"}</Pill>
          )}
          <form action={action} className="flex items-center gap-1.5">
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="userId" value={advisor.userId} />
            {/* 멈춰 둔 동안에는 재발급을 막는다. 새 링크를 내줘도 멈춤 검사에서 걸리고,
                다시 열면 기존 링크가 그대로 열리므로 바꿀 이유가 없다. */}
            <button type="submit" name="intent" value="reissue" className={rowButton} disabled={pending || accountDisabled || suspended}><UiText>{pending ? "처리 중" : "링크 재발급"}</UiText></button>
            {/* 회수보다 가벼운 수단이라 회수 왼쪽에 둔다. 링크·초대·담당 팀이 모두 남는다. */}
            <button type="submit" name="intent" value={suspended ? "resume" : "suspend"} className={rowButton} disabled={pending}>
              <UiText>{suspended ? "심사 다시 열기" : "심사 멈춤"}</UiText>
            </button>
            <button type="submit" name="intent" value="revoke" className={rowButton} disabled={pending}><UiText>{"초대 회수"}</UiText></button>
          </form>
        </div>
      </div>
      {suspended ? (
        <p className="text-xs text-[var(--muted)]"><UiText>{"심사를 멈춰 두었습니다. 링크와 담당 팀은 그대로라 다시 열면 기존 링크가 그대로 열립니다."}</UiText></p>
      ) : null}
      {accountDisabled ? (
        // 사용자 관리에는 자문위원 활성화 버튼을 두지 않는다. 되살리는 길은 이 화면뿐이다.
        <p className="text-xs text-[var(--muted)]"><UiText>{"계정이 비활성 상태입니다. 초대를 회수한 뒤 다시 초대하면 계정도 함께 활성화되고 새 링크가 발급됩니다."}</UiText></p>
      ) : null}
      <ActionResult state={state} />
    </li>
  );
}

function RevokedAdvisorRow({ programId, advisor }: { programId: string; advisor: ProgramAdvisorRow }) {
  const [state, action, pending] = useActionState(reinviteAdvisorAction, idleState);
  // 운영자가 사용자 관리에서 직접 잠근 계정은 초대로 풀지 않는다. 서버도 거절하지만 눌러 본
  // 뒤에야 알게 하지 않는다. 회수로 내려간 계정은 다시 부를 때 함께 되살아나므로 막지 않는다.
  const lockedByOperator = advisor.accountStatus === "WITHDRAWN";
  return (
    <li className="grid gap-2 border-t border-[var(--line)] px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--ink)]">
            {advisor.name}
            <Pill>{"초대 회수됨"}</Pill>
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{advisor.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {advisor.revokedAt ? (
            <span className="text-xs tabular-nums text-[var(--muted)]">
              <UiText>{"회수"}</UiText>{" "}<UiDate value={advisor.revokedAt} mode="dateTime" />
            </span>
          ) : null}
          <form action={action}>
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="userId" value={advisor.userId} />
            <button type="submit" className={rowButton} disabled={pending || lockedByOperator}>
              <UiText>{pending ? "처리 중" : "다시 초대"}</UiText>
            </button>
          </form>
        </div>
      </div>
      {lockedByOperator ? (
        <p className="text-xs text-[var(--muted)]"><UiText>{"탈퇴한 계정은 다시 초대할 수 없습니다."}</UiText></p>
      ) : null}
      <ActionResult state={state} />
    </li>
  );
}

function AssignmentForm({ programId, advisor, topics }: { programId: string; advisor: ProgramAdvisorRow; topics: ProgramTopicForAssignment[] }) {
  const [state, action, pending] = useActionState(assignAdvisorTeamsAction, idleState);
  const assigned = new Set(advisor.assignedTopicIds);
  return (
    <details className="group border-t border-[var(--line)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 transition-colors hover:bg-[#fafbfc]">
        <span className="min-w-0">
          <strong className="text-sm font-medium text-[var(--ink)]">{advisor.name}</strong>
          <span className="ml-2 text-xs text-[var(--muted)]">{advisor.email}</span>
        </span>
        <span className="flex items-center gap-2 text-[0.8125rem] tabular-nums text-[var(--ink)]">
          <UiText>{`담당 ${advisor.assignedTopicIds.length}팀`}</UiText>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-[var(--muted)] stroke-[1.6] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
        </span>
      </summary>
      <form action={action} aria-busy={pending} className="grid gap-3 px-5 pb-4">
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
          <button type="submit" className={rowButton} disabled={pending}><UiText>{pending ? "저장 중" : "할당 저장"}</UiText></button>
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
    return <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"아직 채점한 자문위원이 없습니다."}</UiText></p>;
  }
  const columns = [...advisorColumns.entries()];
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-[0.8125rem]">
        <thead>
          <tr className="text-left">
            <th scope="col" className="px-5 py-2 text-xs font-normal text-[var(--muted)]"><UiText>{"팀"}</UiText></th>
            {columns.map(([advisorId, advisorName]) => (
              <th key={advisorId} scope="col" className="px-4 py-2 text-right text-xs font-normal text-[var(--muted)]">{advisorName}</th>
            ))}
            <th scope="col" className="py-2 pl-4 pr-5 text-right text-xs font-normal text-[var(--muted)]"><UiText>{"평균"}</UiText></th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => {
            const scoreByAdvisor = new Map(row.scores.map((score) => [score.advisorId, score.total]));
            return (
              <tr key={row.teamId} className="border-t border-[var(--line)]">
                <th scope="row" className="px-5 py-2.5 text-left text-sm font-medium text-[var(--ink)]">{row.teamName}</th>
                {columns.map(([advisorId]) => (
                  <td key={advisorId} className="px-4 py-2.5 text-right tabular-nums">{scoreByAdvisor.has(advisorId) ? scoreByAdvisor.get(advisorId) : <Missing />}</td>
                ))}
                <td className="py-2.5 pl-4 pr-5 text-right font-semibold tabular-nums text-[var(--accent-ink)]">{row.average === null ? <Missing /> : row.average.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
