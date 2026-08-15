"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/topics/_management/program-definition-manager.module.css";
import {
  archiveProgramReportDefinitionAction,
  createProgramReportDefinitionAction,
  moveProgramReportDefinitionAction,
  type ProgramReportActionState,
  updateProgramReportDefinitionAction,
} from "@/app/topics/_management/program-report-requirement-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
import { DateTimeInput, TextInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { AddIcon, ArchiveIcon, ArrowDownIcon, ArrowUpIcon, CloseIcon, EditIcon, TrashIcon } from "@/shared/ui/workspace-icons";

const programReportInitialState: ProgramReportActionState = { status: "idle", message: "" };

export type ProgramReportDefinitionRow = { id: string; title: string; dueAt: Date; versionCount: number };
type Editor = { mode: "create" } | { mode: "edit"; definition: ProgramReportDefinitionRow };

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(value);
}

function ActionMessage({ state }: { state: ProgramReportActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`${styles.status} ${state.status === "error" ? styles.statusError : styles.statusSuccess}`}><UiText>{state.message}</UiText></p>;
}

export function ProgramReportRequirementForm({ programId, definitions }: { programId: string; definitions: ProgramReportDefinitionRow[] }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  return <div className={styles.manager}>
    <div className={styles.toolbar}>
      <button type="button" className="button-primary gap-2" onClick={() => setEditor({ mode: "create" })}><AddIcon className="size-4" /><UiText>{"보고서 추가"}</UiText></button>
    </div>
    {definitions.length ? <ol className={styles.definitionList}>{definitions.map((definition, index) => <DefinitionRow key={definition.id} definition={definition} programId={programId} index={index} count={definitions.length} onEdit={(next) => setEditor({ mode: "edit", definition: next })} />)}</ol> : <p className={styles.empty}><UiText>{"설정된 제출 보고서가 없습니다."}</UiText></p>}
    {editor ? <ReportDefinitionDialog programId={programId} editor={editor} onRequestClose={() => setEditor(null)} /> : null}
  </div>;
}

function DefinitionRow({ definition, programId, index, count, onEdit }: { definition: ProgramReportDefinitionRow; programId: string; index: number; count: number; onEdit: (definition: ProgramReportDefinitionRow) => void }) {
  const [archiveState, archiveAction, archiving] = useActionState(archiveProgramReportDefinitionAction.bind(null, definition.id, programId), programReportInitialState);
  return <li className={styles.definitionItem}>
    <div className={styles.itemSummary}>
      <div className={styles.itemMeta}>
        <strong>{definition.title}</strong>
        <span>{`제출 마감 ${formatDate(definition.dueAt)} · 제출 버전 ${definition.versionCount}개`}</span>
      </div>
      <div className={styles.summaryActions}>
        <button type="button" className={`button-secondary ${styles.settingsButton}`} onClick={() => onEdit(definition)}><EditIcon className="size-4" /><UiText>{"세부 설정"}</UiText></button>
        <Move definition={definition} programId={programId} direction="up" disabled={index === 0} />
        <Move definition={definition} programId={programId} direction="down" disabled={index === count - 1} />
        <form action={archiveAction}><IconButton type="submit" className="text-[var(--danger)] hover:text-[var(--danger)]" disabled={archiving} aria-label={`${definition.title} ${definition.versionCount ? "보관" : "삭제"}`} title={definition.versionCount ? "보고서 보관" : "보고서 삭제"}>{definition.versionCount ? <ArchiveIcon className="size-5" /> : <TrashIcon className="size-5" />}</IconButton></form>
      </div>
    </div>
    <ActionMessage state={archiveState} />
  </li>;
}

function Move({ definition, programId, direction, disabled }: { definition: ProgramReportDefinitionRow; programId: string; direction: "up" | "down"; disabled: boolean }) {
  const [state, action, pending] = useActionState(moveProgramReportDefinitionAction.bind(null, definition.id, programId, direction), programReportInitialState);
  const label = `${definition.title} ${direction === "up" ? "위로" : "아래로"} 이동`;
  return <form action={action}><IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>{direction === "up" ? <ArrowUpIcon className="size-5" /> : <ArrowDownIcon className="size-5" />}</IconButton>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}

function ReportDefinitionDialog({ programId, editor, onRequestClose }: { programId: string; editor: Editor; onRequestClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const definition = editor.mode === "edit" ? editor.definition : null;
  const [state, action, pending] = useActionState(
    editor.mode === "create"
      ? createProgramReportDefinitionAction.bind(null, programId)
      : updateProgramReportDefinitionAction.bind(null, definition!.id, programId),
    programReportInitialState,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    if (state.status === "success") onRequestClose();
  }, [onRequestClose, state.status]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onRequestClose(); }}>
      <form action={action} className={styles.dialogSurface}>
        <header className={styles.dialogHeader}>
          <h2 id={titleId}><UiText>{editor.mode === "create" ? "보고서 추가" : "보고서 세부 설정"}</UiText></h2>
          <IconButton type="button" onClick={onRequestClose} aria-label="보고서 설정 닫기" title="닫기"><CloseIcon className="size-5" /></IconButton>
        </header>
        <div className={styles.dialogBody}>
          <div className={styles.formGrid}>
            <label className={styles.field}><span><UiText>{"보고서 제목"}</UiText></span><TextInput name="title" defaultValue={definition?.title ?? ""} maxLength={100} required readOnly={definition?.versionCount ? true : undefined} placeholder="예: 요구사항 분석 보고서" /></label>
            <label className={styles.field}><span><UiText>{"제출 마감"}</UiText></span><DateTimeInput name="dueAt" defaultValue={definition ? koreanDateTimeInput(definition.dueAt) : ""} required aria-label="제출 마감" /></label>
          </div>
          {definition?.versionCount ? <p className={styles.hint}><UiText>{"제출 이력이 있어 보고서 제목은 변경할 수 없습니다."}</UiText></p> : null}
          <ActionMessage state={state} />
        </div>
        <footer className={styles.dialogFooter}>
          <button type="button" className="button-secondary" onClick={onRequestClose}><UiText>{"취소"}</UiText></button>
          <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "저장 중" : editor.mode === "create" ? "보고서 추가" : "저장"}</UiText></button>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
