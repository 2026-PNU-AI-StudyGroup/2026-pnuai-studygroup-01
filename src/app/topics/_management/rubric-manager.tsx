"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import builderStyles from "@/app/topics/_management/program-create-definition-builders.module.css";
import policyStyles from "@/app/topics/_management/rubric-manager.module.css";
import {
  archiveRubricAction,
  createCriterionAction,
  createRubricAction,
  deleteCriterionAction,
  moveCriterionAction,
  moveRubricAction,
  type RubricActionState,
  updateCriterionAction,
  updateRubricAction,
} from "@/app/topics/_management/rubric-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
import { DateTimeInput, TextInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { AddIcon, ArrowDownIcon, ArrowUpIcon, CloseIcon, TrashIcon } from "@/shared/ui/workspace-icons";

const initialState: RubricActionState = { status: "idle", message: "" };

export type CriterionRow = { id: string; label: string; maxPoints: number };
export type RubricRow = {
  id: string;
  divisionId: string | null;
  title: string;
  gradingDueAt: Date;
  audience: "STAFF_ONLY" | "TEAM_MEMBERS";
  criteria: CriterionRow[];
  scoreCount: number;
};
export type RubricDivisionRow = { id: string; name: string };

type CriterionDraft = { id: number; label: string; maxPoints: number };
type Editor =
  | { mode: "create"; divisionId: string; title: string; gradingDueAt: string }
  | { mode: "edit"; rubric: RubricRow };

const audienceOptions = [
  { value: "STAFF_ONLY", label: "관계자 전용", description: "관리자와 담당 교수·조교만 확인" },
  { value: "TEAM_MEMBERS", label: "팀원 공개", description: "채점 마감 후 팀원에게 공개" },
];

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(value);
}

function move<T>(items: T[], index: number, direction: "up" | "down") {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ActionMessage({ state }: { state: RubricActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? policyStyles.error : policyStyles.success}><UiText>{state.message}</UiText></p>;
}

export function RubricManager({ programId, divisions, rubrics }: { programId: string; divisions: RubricDivisionRow[]; rubrics: RubricRow[] }) {
  const [divisionId, setDivisionId] = useState("");
  const [title, setTitle] = useState("");
  const [gradingDueAt, setGradingDueAt] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const scopeOptions = [
    { value: "", label: "공통 채점표", description: "프로그램의 모든 프로젝트에 적용" },
    ...divisions.map((division) => ({ value: division.id, label: division.name, description: "공통 채점표에 더해 이 분과에 적용" })),
  ];

  function openCreateEditor() {
    if (!title.trim() || !gradingDueAt) return;
    setEditor({ mode: "create", divisionId, title: title.trim(), gradingDueAt });
    setDivisionId("");
    setTitle("");
    setGradingDueAt("");
  }

  return (
    <div className={builderStyles.builder}>
      <div className={`${builderStyles.quickAddRow} ${builderStyles.rubricQuickAdd}`}>
        <label className={builderStyles.field}><span><UiText>{"적용 범위"}</UiText></span><CustomSelect name="_newRubricScope" ariaLabel="새 채점표 적용 범위" value={divisionId} onValueChange={setDivisionId} options={scopeOptions} /></label>
        <label className={builderStyles.field}><span><UiText>{"채점표 제목"}</UiText></span><TextInput value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="예: 공식 평가" /></label>
        <label className={builderStyles.field}><span><UiText>{"채점 마감"}</UiText></span><DateTimeInput value={gradingDueAt} onValueChange={setGradingDueAt} aria-label="새 채점표 채점 마감" /></label>
        <button type="button" className={`button-primary ${builderStyles.addButton}`} onClick={openCreateEditor} disabled={!title.trim() || !gradingDueAt}><AddIcon className="size-4" /><UiText>{"추가"}</UiText></button>
      </div>

      {rubrics.length ? <ol className={builderStyles.definitionList}>{rubrics.map((rubric) => {
        const sameScope = rubrics.filter((item) => item.divisionId === rubric.divisionId);
        return <RubricListItem
          key={rubric.id}
          programId={programId}
          rubric={rubric}
          scopeLabel={rubric.divisionId ? divisions.find((division) => division.id === rubric.divisionId)?.name ?? "분과 전용 채점표" : "공통 채점표"}
          index={sameScope.findIndex((item) => item.id === rubric.id)}
          count={sameScope.length}
          onEdit={(event) => {
            settingsTriggerRef.current = event.currentTarget;
            setEditor({ mode: "edit", rubric });
          }}
        />;
      })}</ol> : <p className={builderStyles.emptyState}><UiText>{"필요한 채점표만 추가할 수 있습니다."}</UiText></p>}

      {editor ? <RubricEditorDialog programId={programId} divisions={divisions} editor={editor} onRequestClose={() => {
        setEditor(null);
        window.requestAnimationFrame(() => settingsTriggerRef.current?.focus());
      }} /> : null}
    </div>
  );
}

function RubricListItem({ programId, rubric, scopeLabel, index, count, onEdit }: {
  programId: string;
  rubric: RubricRow;
  scopeLabel: string;
  index: number;
  count: number;
  onEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [deleteState, deleteAction, deleting] = useActionState(archiveRubricAction.bind(null, rubric.id, programId), initialState);
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const audience = rubric.audience === "TEAM_MEMBERS" ? "팀원 공개" : "관계자 전용";
  const locked = rubric.scoreCount > 0;
  const deletionHintId = `rubric-delete-restriction-${rubric.id}`;
  return <li className={builderStyles.definitionItem}>
    <div className={builderStyles.itemSummary}>
      <div className={builderStyles.itemMeta}><strong>{rubric.title}</strong><span>{`${scopeLabel} · ${formatDate(rubric.gradingDueAt)} · ${audience} · 항목 ${rubric.criteria.length}개 / ${total}점${locked ? " · 구조 잠김" : ""}`}</span></div>
      <div className={builderStyles.summaryActions}>
        <button type="button" className={`button-secondary ${builderStyles.settingsButton}`} onClick={onEdit}><UiText>{"세부 설정"}</UiText></button>
        <RubricMove rubric={rubric} programId={programId} direction="up" disabled={locked || index === 0} />
        <RubricMove rubric={rubric} programId={programId} direction="down" disabled={locked || index === count - 1} />
        <span className="group relative inline-flex" tabIndex={locked ? 0 : undefined} aria-describedby={locked ? deletionHintId : undefined}>
          <form action={deleteAction}><IconButton type="submit" className={locked ? "cursor-not-allowed text-[var(--muted)]" : "text-[var(--danger)] hover:text-[var(--danger)]"} disabled={locked || deleting} aria-label={`${rubric.title} 채점표 삭제`} title="채점표 삭제"><TrashIcon className="size-5" /></IconButton></form>
          {locked ? <span id={deletionHintId} role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] right-0 z-20 w-max max-w-56 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-center text-xs font-semibold leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><UiText>{"점수가 저장된 채점표는 삭제할 수 없습니다."}</UiText></span> : null}
        </span>
      </div>
    </div>
    <ActionMessage state={deleteState} />
  </li>;
}

function RubricMove({ rubric, programId, direction, disabled }: { rubric: RubricRow; programId: string; direction: "up" | "down"; disabled: boolean }) {
  const [state, action, pending] = useActionState(moveRubricAction.bind(null, rubric.id, programId, direction), initialState);
  const label = `${rubric.title} ${direction === "up" ? "위로" : "아래로"} 이동`;
  return <form action={action}><IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>{direction === "up" ? <ArrowUpIcon className="size-5" /> : <ArrowDownIcon className="size-5" />}</IconButton>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}

function RubricEditorDialog({ programId, divisions, editor, onRequestClose }: {
  programId: string;
  divisions: RubricDivisionRow[];
  editor: Editor;
  onRequestClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const formId = useId();
  const rubric = editor.mode === "edit" ? editor.rubric : null;
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [state, action, pending] = useActionState(
    editor.mode === "create" ? createRubricAction.bind(null, programId) : updateRubricAction.bind(null, rubric!.id, programId),
    initialState,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  useEffect(() => { if (state.status === "success") onRequestClose(); }, [onRequestClose, state.status]);

  if (typeof document === "undefined") return null;

  const scopeLabel = rubric?.divisionId ? divisions.find((division) => division.id === rubric.divisionId)?.name ?? "분과 전용 채점표" : "공통 채점표";
  const initialTitle = editor.mode === "create" ? editor.title : rubric!.title;
  const initialDeadline = editor.mode === "create" ? editor.gradingDueAt : koreanDateTimeInput(rubric!.gradingDueAt);
  const canSave = editor.mode === "edit" || criteria.length > 0;
  return createPortal(
    <dialog ref={dialogRef} className={builderStyles.rubricDialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onRequestClose(); }}>
      <div className={builderStyles.dialogSurface}>
        <header className={builderStyles.dialogHeader}><div><h3 id={titleId}><UiText>{editor.mode === "create" ? "새 채점표 설정" : "채점표 세부 설정"}</UiText></h3></div><IconButton type="button" onClick={onRequestClose} aria-label="채점표 설정 닫기" title="닫기"><CloseIcon className="size-5" /></IconButton></header>
        <div className={builderStyles.dialogBody}>
          <form id={formId} action={action} className={builderStyles.rubricSettingsModal}>
            {editor.mode === "create" ? <><input type="hidden" name="divisionId" value={editor.divisionId} /><ReadOnlyField label="적용 범위" value={editor.divisionId ? divisions.find((division) => division.id === editor.divisionId)?.name ?? "분과 전용 채점표" : "공통 채점표"} /></> : <ReadOnlyField label="적용 범위" value={scopeLabel} />}
            <label className={builderStyles.field}><span><UiText>{"채점표 제목"}</UiText></span><TextInput name="title" defaultValue={initialTitle} maxLength={100} required readOnly={rubric?.scoreCount ? true : undefined} placeholder="예: 공식 평가" /></label>
            <label className={builderStyles.field}><span><UiText>{"채점 마감"}</UiText></span><DateTimeInput name="gradingDueAt" defaultValue={initialDeadline} required aria-label="채점 마감" /></label>
            <label className={builderStyles.field}><span><UiText>{"점수 공개"}</UiText></span><CustomSelect name="audience" ariaLabel="점수 공개 대상" defaultValue={rubric?.audience ?? "STAFF_ONLY"} options={audienceOptions} /></label>
            {editor.mode === "create" ? <input type="hidden" name="criteriaJson" value={JSON.stringify(criteria.map(({ label, maxPoints }) => ({ label, maxPoints })))} /> : null}
          </form>
          {editor.mode === "create" ? <DraftCriteria criteria={criteria} onChange={setCriteria} /> : <PersistedCriteria programId={programId} rubric={rubric!} />}
          {editor.mode === "create" && criteria.length === 0 ? <p role="status" className={policyStyles.error}><UiText>{"채점표를 저장하려면 평가 항목을 하나 이상 추가해 주세요."}</UiText></p> : null}
          <ActionMessage state={state} />
        </div>
        <footer className={builderStyles.dialogFooter}><button type="button" className="button-secondary" onClick={onRequestClose}><UiText>{"취소"}</UiText></button><button type="submit" form={formId} className="button-primary" disabled={pending || !canSave}><UiText>{pending ? "저장 중" : "저장"}</UiText></button></footer>
      </div>
    </dialog>,
    document.body,
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className={builderStyles.field}><span><UiText>{label}</UiText></span><p className="form-control flex items-center bg-[var(--surface-subtle)]"><UiText>{value}</UiText></p></div>;
}

function DraftCriteria({ criteria, onChange }: { criteria: CriterionDraft[]; onChange: (criteria: CriterionDraft[]) => void }) {
  const [label, setLabel] = useState("");
  const [maxPoints, setMaxPoints] = useState(10);
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  function add() {
    if (!label.trim()) return;
    onChange([...criteria, { id: Date.now(), label: label.trim(), maxPoints }]);
    setLabel("");
    setMaxPoints(10);
  }
  return <section className={builderStyles.criteria} aria-labelledby="new-rubric-criteria"><header className={builderStyles.criteriaHeader}><h4 id="new-rubric-criteria"><UiText>{"평가 항목"}</UiText></h4><span><UiText>{`${criteria.length}개 · 총점 ${total}점`}</UiText></span></header><div className={builderStyles.criteriaBody}><div className={builderStyles.criteriaRow}><label className={builderStyles.field}><span><UiText>{"항목 이름"}</UiText></span><TextInput value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} placeholder="예: 문제 정의" /></label><label className={`${builderStyles.field} ${builderStyles.scoreField}`}><span><UiText>{"배점"}</UiText></span><TextInput value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} type="number" min={1} max={100} /></label><button type="button" className={`button-secondary ${builderStyles.addButton}`} onClick={add} disabled={!label.trim()}><AddIcon className="size-4" /><UiText>{"추가"}</UiText></button></div>{criteria.length ? <ol className={builderStyles.criteriaList}>{criteria.map((criterion, index) => <li key={criterion.id} className={builderStyles.criterionItem}><CriterionDraftRow criterion={criterion} index={index} criteria={criteria} onChange={onChange} /></li>)}</ol> : null}</div></section>;
}

function CriterionDraftRow({ criterion, index, criteria, onChange }: { criterion: CriterionDraft; index: number; criteria: CriterionDraft[]; onChange: (criteria: CriterionDraft[]) => void }) {
  return <div className={builderStyles.criteriaRow}><label className={builderStyles.field}><span className="sr-only"><UiText>{"항목 이름"}</UiText></span><TextInput value={criterion.label} onChange={(event) => onChange(criteria.map((item) => item.id === criterion.id ? { ...item, label: event.target.value } : item))} maxLength={60} required aria-label={`${index + 1}번째 평가 항목 이름`} /></label><label className={`${builderStyles.field} ${builderStyles.scoreField}`}><span className="sr-only"><UiText>{"배점"}</UiText></span><TextInput value={criterion.maxPoints} onChange={(event) => onChange(criteria.map((item) => item.id === criterion.id ? { ...item, maxPoints: Number(event.target.value) } : item))} type="number" min={1} max={100} required aria-label={`${index + 1}번째 평가 항목 배점`} /></label><CriterionActions title={criterion.label} index={index} length={criteria.length} onMove={(direction) => onChange(move(criteria, index, direction))} onDelete={() => onChange(criteria.filter((item) => item.id !== criterion.id))} /></div>;
}

function PersistedCriteria({ programId, rubric }: { programId: string; rubric: RubricRow }) {
  const editable = rubric.scoreCount === 0;
  const [state, action, pending] = useActionState(createCriterionAction.bind(null, rubric.id, programId), initialState);
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return <section className={builderStyles.criteria} aria-labelledby={`criteria-${rubric.id}`}><header className={builderStyles.criteriaHeader}><h4 id={`criteria-${rubric.id}`}><UiText>{"평가 항목"}</UiText></h4><span><UiText>{`${rubric.criteria.length}개 · 총점 ${total}점`}</UiText></span></header><div className={builderStyles.criteriaBody}>{editable ? <form action={action} className={builderStyles.criteriaRow}><label className={builderStyles.field}><span><UiText>{"항목 이름"}</UiText></span><TextInput name="label" maxLength={60} required placeholder="예: 문제 정의" /></label><label className={`${builderStyles.field} ${builderStyles.scoreField}`}><span><UiText>{"배점"}</UiText></span><TextInput name="maxPoints" type="number" min={1} max={100} defaultValue={10} required /></label><button className={`button-secondary ${builderStyles.addButton}`} disabled={pending}><AddIcon className="size-4" /><UiText>{pending ? "추가 중" : "추가"}</UiText></button></form> : <p className={policyStyles.locked}><UiText>{"점수가 저장되어 평가 항목, 배점과 순서는 변경할 수 없습니다."}</UiText></p>}<ActionMessage state={state} />{rubric.criteria.length ? <ol className={builderStyles.criteriaList}>{rubric.criteria.map((criterion, index) => <li key={criterion.id} className={builderStyles.criterionItem}><PersistedCriterionRow programId={programId} rubric={rubric} criterion={criterion} index={index} editable={editable} /></li>)}</ol> : <p className={builderStyles.emptyState}><UiText>{"아직 평가 항목이 없습니다."}</UiText></p>}</div></section>;
}

function PersistedCriterionRow({ programId, rubric, criterion, index, editable }: { programId: string; rubric: RubricRow; criterion: CriterionRow; index: number; editable: boolean }) {
  const [state, action, pending] = useActionState(updateCriterionAction.bind(null, criterion.id, rubric.id, programId), initialState);
  if (!editable) return <div className={builderStyles.criteriaRow}><strong>{criterion.label}</strong><span><UiText>{`${criterion.maxPoints}점`}</UiText></span></div>;
  return <div className={policyStyles.persistedCriterionRow}><form action={action} className={policyStyles.criterionEdit}><TextInput name="label" defaultValue={criterion.label} maxLength={60} required aria-label={`${index + 1}번째 평가 항목 이름`} /><TextInput name="maxPoints" type="number" min={1} max={100} defaultValue={criterion.maxPoints} required aria-label={`${index + 1}번째 평가 항목 배점`} /><button className="button-quiet text-xs" disabled={pending}><UiText>{"저장"}</UiText></button></form><PersistedCriterionActions programId={programId} rubric={rubric} criterion={criterion} index={index} /><ActionMessage state={state} /></div>;
}

function CriterionActions({ title, index, length, onMove, onDelete }: { title: string; index: number; length: number; onMove: (direction: "up" | "down") => void; onDelete: () => void }) {
  return <div className={builderStyles.itemActions}><IconButton type="button" onClick={() => onMove("up")} disabled={index === 0} aria-label={`${title} 위로 이동`} title="위로 이동"><ArrowUpIcon className="size-5" /></IconButton><IconButton type="button" onClick={() => onMove("down")} disabled={index === length - 1} aria-label={`${title} 아래로 이동`} title="아래로 이동"><ArrowDownIcon className="size-5" /></IconButton><IconButton type="button" onClick={onDelete} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label={`${title} 삭제`} title="삭제"><TrashIcon className="size-5" /></IconButton></div>;
}

function PersistedCriterionActions({ programId, rubric, criterion, index }: { programId: string; rubric: RubricRow; criterion: CriterionRow; index: number }) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteCriterionAction.bind(null, criterion.id, rubric.id, programId), initialState);
  return <div className={builderStyles.itemActions}><CriterionMove programId={programId} rubric={rubric} criterion={criterion} direction="up" disabled={index === 0} /><CriterionMove programId={programId} rubric={rubric} criterion={criterion} direction="down" disabled={index === rubric.criteria.length - 1} /><form action={deleteAction}><IconButton type="submit" className="text-[var(--danger)] hover:text-[var(--danger)]" disabled={deleting} aria-label={`${criterion.label} 삭제`} title="삭제"><TrashIcon className="size-5" /></IconButton></form><ActionMessage state={deleteState} /></div>;
}

function CriterionMove({ programId, rubric, criterion, direction, disabled }: { programId: string; rubric: RubricRow; criterion: CriterionRow; direction: "up" | "down"; disabled: boolean }) {
  const [state, action, pending] = useActionState(moveCriterionAction.bind(null, criterion.id, rubric.id, programId, direction), initialState);
  const label = `${criterion.label} ${direction === "up" ? "위로" : "아래로"} 이동`;
  return <form action={action}><IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>{direction === "up" ? <ArrowUpIcon className="size-5" /> : <ArrowDownIcon className="size-5" />}</IconButton>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}
