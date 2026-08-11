"use client";

import { useActionState, useState } from "react";

import {
  archiveProgramReportDefinitionAction,
  createProgramReportDefinitionAction,
  moveProgramReportDefinitionAction,
  programReportInitialState,
  updateProgramReportDefinitionAction,
} from "@/app/admin/programs/_actions/program-report-requirement-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
import { DateTimeInput } from "@/shared/ui/form-system";

export type ProgramReportDefinitionRow = { id: string; title: string; dueAt: Date; versionCount: number };

export function ProgramReportRequirementForm({ programId, definitions }: { programId: string; definitions: ProgramReportDefinitionRow[] }) {
  const [state, action, pending] = useActionState(createProgramReportDefinitionAction.bind(null, programId), programReportInitialState);
  return <div className="grid gap-6">
    <form action={action} className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_auto] sm:items-end">
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"보고서 제목"}</UiText><UiInput name="title" maxLength={100} required className="form-control bg-white" placeholder="예: 요구사항 분석 보고서" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"제출 마감"}</UiText><DateTimeInput name="dueAt" required /></label>
      <button className="button-primary" disabled={pending}><UiText>{pending ? "추가 중" : "보고서 추가"}</UiText></button>
    </form>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm font-semibold text-[var(--danger)]" : "text-sm font-semibold text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
    {definitions.length ? <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{definitions.map((definition, index) => <DefinitionRow key={definition.id} definition={definition} programId={programId} index={index} count={definitions.length} />)}</ul> : <p className="text-sm text-[var(--muted)]"><UiText>{"아직 제출 보고서가 없습니다. 필요한 보고서를 제목과 마감으로 추가해 주세요."}</UiText></p>}
  </div>;
}

function DefinitionRow({ definition, programId, index, count }: { definition: ProgramReportDefinitionRow; programId: string; index: number; count: number }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState(updateProgramReportDefinitionAction.bind(null, definition.id, programId), programReportInitialState);
  const [archiveState, archiveAction, archiving] = useActionState(archiveProgramReportDefinitionAction.bind(null, definition.id, programId), programReportInitialState);
  return <li className="grid gap-3 py-4">
    {editing ? <form action={updateAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_auto] sm:items-end">
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"보고서 제목"}</UiText><UiInput name="title" defaultValue={definition.title} maxLength={100} required readOnly={definition.versionCount > 0} className="form-control" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"제출 마감"}</UiText><DateTimeInput name="dueAt" defaultValue={koreanDateTimeInput(definition.dueAt)} required /></label>
      <div className="flex gap-2"><button className="button-primary" disabled={updating}><UiText>{"저장"}</UiText></button><button type="button" className="button-quiet" onClick={() => setEditing(false)}><UiText>{"취소"}</UiText></button></div>
      {updateState.message ? <p role={updateState.status === "error" ? "alert" : "status"} className="text-sm text-[var(--danger)] sm:col-span-3"><UiText>{updateState.message}</UiText></p> : null}
    </form> : <div className="flex flex-wrap items-center justify-between gap-3">
      <div><strong>{definition.title}</strong><p className="mt-1 text-xs text-[var(--muted)]"><UiText>{"제출 마감"}</UiText>{" · "}<time dateTime={definition.dueAt.toISOString()}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(definition.dueAt)}</time>{` · 제출 버전 ${definition.versionCount}개`}</p></div>
      <div className="flex flex-wrap gap-1"><Move definitionId={definition.id} programId={programId} direction="up" disabled={index === 0} /><Move definitionId={definition.id} programId={programId} direction="down" disabled={index === count - 1} /><button type="button" className="button-quiet text-xs" onClick={() => setEditing(true)}><UiText>{"수정"}</UiText></button><form action={archiveAction}><button className="button-quiet text-xs text-[var(--danger)]" disabled={archiving}><UiText>{definition.versionCount ? "보관" : "삭제"}</UiText></button></form></div>
    </div>}
    {archiveState.message ? <p role={archiveState.status === "error" ? "alert" : "status"} className={archiveState.status === "error" ? "text-xs text-[var(--danger)]" : "text-xs text-[var(--success)]"}><UiText>{archiveState.message}</UiText></p> : null}
  </li>;
}

function Move({ definitionId, programId, direction, disabled }: { definitionId: string; programId: string; direction: "up" | "down"; disabled: boolean }) {
  const [state, action, pending] = useActionState(moveProgramReportDefinitionAction.bind(null, definitionId, programId, direction), programReportInitialState);
  return <form action={action}><button className="button-quiet text-xs" disabled={disabled || pending}><UiText>{direction === "up" ? "위로" : "아래로"}</UiText></button>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}
