"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/topics/_management/program-definition-manager.module.css";
import {
  archiveRubricAction,
  createCriterionAction,
  createRubricAction,
  deleteCriterionAction,
  moveCriterionAction,
  moveRubricAction,
  setDivisionRubricModeAction,
  type RubricActionState,
  updateCriterionAction,
  updateRubricAction,
} from "@/app/topics/_management/rubric-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
import { DateTimeInput, TextInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { AddIcon, ArrowDownIcon, ArrowUpIcon, CloseIcon, EditIcon, TrashIcon } from "@/shared/ui/workspace-icons";

const rubricInitialState: RubricActionState = { status: "idle", message: "" };

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
export type RubricDivisionRow = { id: string; name: string; rubricMode: "INHERIT_COMMON" | "CUSTOM" };

type CriterionDraft = { id: number; label: string; maxPoints: number };
type Editor = { mode: "create" } | { mode: "edit"; rubric: RubricRow };

const audienceOptions = [
  { value: "STAFF_ONLY", label: "관계자 전용" },
  { value: "TEAM_MEMBERS", label: "팀원 공개" },
];

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(value);
}

function ActionMessage({ state }: { state: RubricActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`${styles.status} ${state.status === "error" ? styles.statusError : styles.statusSuccess}`}><UiText>{state.message}</UiText></p>;
}

function move<T>(items: T[], index: number, direction: "up" | "down") {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function RubricManager({ programId, divisions, rubrics }: { programId: string; divisions: RubricDivisionRow[]; rubrics: RubricRow[] }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const customDivisions = divisions.filter((division) => division.rubricMode === "CUSTOM");

  return (
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <button type="button" className="button-primary gap-2" onClick={() => setEditor({ mode: "create" })}><AddIcon className="size-4" /><UiText>{"채점표 추가"}</UiText></button>
      </div>

      <RubricScope
        programId={programId}
        title="공통 채점표"
        description="공통 상속 분과와 미분과 프로젝트에 적용됩니다."
        rubrics={rubrics.filter((rubric) => rubric.divisionId === null)}
        onEdit={(rubric) => setEditor({ mode: "edit", rubric })}
      />

      {divisions.map((division) => (
        <section key={division.id} className={styles.scope}>
          <div className={styles.scopeHeader}>
            <div>
              <h3>{division.name}</h3>
              <p><UiText>{division.rubricMode === "CUSTOM" ? "분과 전용 채점표를 사용합니다." : "공통 채점표를 상속합니다."}</UiText></p>
            </div>
            <DivisionMode programId={programId} division={division} />
          </div>
          {division.rubricMode === "CUSTOM" ? (
            <RubricScope
              programId={programId}
              title={`${division.name} 전용 채점표`}
              description="이 분과 프로젝트에만 적용됩니다."
              rubrics={rubrics.filter((rubric) => rubric.divisionId === division.id)}
              onEdit={(rubric) => setEditor({ mode: "edit", rubric })}
            />
          ) : null}
        </section>
      ))}

      {editor ? <RubricEditorDialog programId={programId} divisions={customDivisions} editor={editor} onRequestClose={() => setEditor(null)} /> : null}
    </div>
  );
}

function RubricScope({ programId, title, description, rubrics, onEdit }: {
  programId: string;
  title: string;
  description: string;
  rubrics: RubricRow[];
  onEdit: (rubric: RubricRow) => void;
}) {
  return (
    <section className={styles.scope}>
      <div className={styles.scopeHeader}>
        <div><h3><UiText>{title}</UiText></h3><p><UiText>{description}</UiText></p></div>
      </div>
      {rubrics.length ? <ol className={styles.definitionList}>
        {rubrics.map((rubric, index) => <RubricListItem key={rubric.id} programId={programId} rubric={rubric} index={index} count={rubrics.length} onEdit={onEdit} />)}
      </ol> : <p className={styles.empty}><UiText>{"설정된 채점표가 없습니다."}</UiText></p>}
    </section>
  );
}

function RubricListItem({ programId, rubric, index, count, onEdit }: {
  programId: string;
  rubric: RubricRow;
  index: number;
  count: number;
  onEdit: (rubric: RubricRow) => void;
}) {
  const [archiveState, archiveAction, archiving] = useActionState(archiveRubricAction.bind(null, rubric.id, programId), rubricInitialState);
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const audience = rubric.audience === "TEAM_MEMBERS" ? "팀원 공개" : "관계자 전용";
  return (
    <li className={styles.definitionItem}>
      <div className={styles.itemSummary}>
        <div className={styles.itemMeta}>
          <strong>{rubric.title}</strong>
          <span>{`${formatDate(rubric.gradingDueAt)} · ${audience} · 항목 ${rubric.criteria.length}개 · ${total}점${rubric.scoreCount ? " · 구조 잠김" : ""}`}</span>
        </div>
        <div className={styles.summaryActions}>
          <button type="button" className={`button-secondary ${styles.settingsButton}`} onClick={() => onEdit(rubric)}><EditIcon className="size-4" /><UiText>{"세부 설정"}</UiText></button>
          <RubricMove rubric={rubric} programId={programId} direction="up" disabled={rubric.scoreCount > 0 || index === 0} />
          <RubricMove rubric={rubric} programId={programId} direction="down" disabled={rubric.scoreCount > 0 || index === count - 1} />
          <form action={archiveAction}><IconButton type="submit" className="text-[var(--danger)] hover:text-[var(--danger)]" disabled={archiving || rubric.scoreCount > 0} aria-label={`${rubric.title} 채점표 삭제`} title="채점표 삭제"><TrashIcon className="size-5" /></IconButton></form>
        </div>
      </div>
      <ActionMessage state={archiveState} />
    </li>
  );
}

function RubricMove({ rubric, programId, direction, disabled }: { rubric: RubricRow; programId: string; direction: "up" | "down"; disabled: boolean }) {
  const [state, action, pending] = useActionState(moveRubricAction.bind(null, rubric.id, programId, direction), rubricInitialState);
  const label = `${rubric.title} ${direction === "up" ? "위로" : "아래로"} 이동`;
  return <form action={action}><IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>{direction === "up" ? <ArrowUpIcon className="size-5" /> : <ArrowDownIcon className="size-5" />}</IconButton>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}

function DivisionMode({ programId, division }: { programId: string; division: RubricDivisionRow }) {
  const nextMode = division.rubricMode === "CUSTOM" ? "INHERIT_COMMON" : "CUSTOM";
  const [state, action, pending] = useActionState(setDivisionRubricModeAction.bind(null, programId, division.id, nextMode), rubricInitialState);
  return <div className={styles.scopeHeaderActions}><form action={action}><button className="button-secondary text-sm" disabled={pending}><UiText>{division.rubricMode === "CUSTOM" ? "공통 상속으로 복귀" : "전용 채점표 사용"}</UiText></button></form><ActionMessage state={state} /></div>;
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
  const [divisionId, setDivisionId] = useState(rubric?.divisionId ?? "");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [state, action, pending] = useActionState(
    editor.mode === "create"
      ? createRubricAction.bind(null, programId)
      : updateRubricAction.bind(null, rubric!.id, programId),
    rubricInitialState,
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

  const scopeOptions = [
    { value: "", label: "공통 채점표" },
    ...divisions.map((division) => ({ value: division.id, label: `${division.name} 전용 채점표` })),
  ];
  const title = rubric?.title ?? "";
  const canCreate = editor.mode === "edit" || criteria.length > 0;

  return createPortal(
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onRequestClose(); }}>
      <div className={styles.dialogSurface}>
        <header className={styles.dialogHeader}>
          <h2 id={titleId}><UiText>{editor.mode === "create" ? "채점표 추가" : "채점표 세부 설정"}</UiText></h2>
          <IconButton type="button" onClick={onRequestClose} aria-label="채점표 설정 닫기" title="닫기"><CloseIcon className="size-5" /></IconButton>
        </header>
        <div className={styles.dialogBody}>
          <form id={formId} action={action} className={styles.formGrid}>
            {editor.mode === "create" ? <label className={styles.field}><span><UiText>{"적용 범위"}</UiText></span><CustomSelect name="divisionId" ariaLabel="채점표 적용 범위" value={divisionId} onValueChange={setDivisionId} options={scopeOptions} /></label> : <div className={styles.field}><span><UiText>{"적용 범위"}</UiText></span><p className="form-control flex items-center bg-[var(--surface-subtle)]">{rubric?.divisionId ? divisions.find((division) => division.id === rubric.divisionId)?.name ?? "분과 전용 채점표" : "공통 채점표"}</p></div>}
            <label className={styles.field}><span><UiText>{"채점표 제목"}</UiText></span><TextInput name="title" defaultValue={title} maxLength={100} required readOnly={rubric?.scoreCount ? true : undefined} placeholder="예: 공식 평가" /></label>
            <label className={styles.field}><span><UiText>{"채점 마감"}</UiText></span><DateTimeInput name="gradingDueAt" defaultValue={rubric ? koreanDateTimeInput(rubric.gradingDueAt) : ""} required aria-label="채점 마감" /></label>
            <label className={styles.field}><span><UiText>{"점수 공개"}</UiText></span><CustomSelect name="audience" ariaLabel="점수 공개 대상" defaultValue={rubric?.audience ?? "STAFF_ONLY"} options={audienceOptions} /></label>
            {editor.mode === "create" ? <input type="hidden" name="criteriaJson" value={JSON.stringify(criteria.map(({ label, maxPoints }) => ({ label, maxPoints })))} /> : null}
          </form>
          {editor.mode === "create" ? <DraftCriteria criteria={criteria} onChange={setCriteria} /> : <PersistedCriteria programId={programId} rubric={rubric!} />}
          {editor.mode === "create" && criteria.length === 0 ? <p role="status" className={`${styles.status} ${styles.statusError}`}><UiText>{"채점표를 추가하려면 평가 항목을 하나 이상 입력해 주세요."}</UiText></p> : null}
          <ActionMessage state={state} />
        </div>
        <footer className={styles.dialogFooter}>
          <button type="button" className="button-secondary" onClick={onRequestClose}><UiText>{"취소"}</UiText></button>
          <button type="submit" form={formId} className="button-primary" disabled={pending || !canCreate}><UiText>{pending ? "저장 중" : editor.mode === "create" ? "채점표 추가" : "저장"}</UiText></button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
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
  return <section className={styles.criteria} aria-labelledby="new-rubric-criteria">
    <div className={styles.criteriaHeader}><h3 id="new-rubric-criteria"><UiText>{"평가 항목"}</UiText></h3><span><UiText>{`${criteria.length}개 · 총점 ${total}점`}</UiText></span></div>
    <div className={styles.criteriaAdd}>
      <label className={styles.field}><span><UiText>{"항목 이름"}</UiText></span><TextInput value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} placeholder="예: 문제 정의" /></label>
      <label className={`${styles.field} ${styles.scoreField}`}><span><UiText>{"배점"}</UiText></span><TextInput value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} type="number" min={1} max={100} /></label>
      <button type="button" className="button-secondary gap-2" onClick={add} disabled={!label.trim()}><AddIcon className="size-4" /><UiText>{"항목 추가"}</UiText></button>
    </div>
    {criteria.length ? <ol className={styles.criteriaList}>{criteria.map((criterion, index) => <li key={criterion.id} className={styles.criterionItem}>
      <div className={styles.criterionRow}>
        <TextInput value={criterion.label} onChange={(event) => onChange(criteria.map((item) => item.id === criterion.id ? { ...item, label: event.target.value } : item))} maxLength={60} aria-label={`${index + 1}번째 평가 항목 이름`} />
        <TextInput value={criterion.maxPoints} onChange={(event) => onChange(criteria.map((item) => item.id === criterion.id ? { ...item, maxPoints: Number(event.target.value) } : item))} type="number" min={1} max={100} aria-label={`${index + 1}번째 평가 항목 배점`} />
        <div className={styles.rowActions}>
          <IconButton type="button" onClick={() => onChange(move(criteria, index, "up"))} disabled={index === 0} aria-label={`${criterion.label} 위로 이동`} title="위로 이동"><ArrowUpIcon className="size-5" /></IconButton>
          <IconButton type="button" onClick={() => onChange(move(criteria, index, "down"))} disabled={index === criteria.length - 1} aria-label={`${criterion.label} 아래로 이동`} title="아래로 이동"><ArrowDownIcon className="size-5" /></IconButton>
          <IconButton type="button" onClick={() => onChange(criteria.filter((item) => item.id !== criterion.id))} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label={`${criterion.label} 삭제`} title="삭제"><TrashIcon className="size-5" /></IconButton>
        </div>
      </div>
    </li>)}</ol> : null}
  </section>;
}

function PersistedCriteria({ programId, rubric }: { programId: string; rubric: RubricRow }) {
  const editable = rubric.scoreCount === 0;
  const [state, action, pending] = useActionState(createCriterionAction.bind(null, rubric.id, programId), rubricInitialState);
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return <section className={styles.criteria} aria-labelledby={`criteria-${rubric.id}`}>
    <div className={styles.criteriaHeader}><h3 id={`criteria-${rubric.id}`}><UiText>{"평가 항목"}</UiText></h3><span><UiText>{`${rubric.criteria.length}개 · 총점 ${total}점`}</UiText></span></div>
    {editable ? <>
      <form action={action} className={styles.criteriaAdd}>
        <label className={styles.field}><span><UiText>{"항목 이름"}</UiText></span><TextInput name="label" maxLength={60} required placeholder="예: 문제 정의" /></label>
        <label className={`${styles.field} ${styles.scoreField}`}><span><UiText>{"배점"}</UiText></span><TextInput name="maxPoints" type="number" min={1} max={100} defaultValue={10} required /></label>
        <button className="button-secondary gap-2" disabled={pending}><AddIcon className="size-4" /><UiText>{pending ? "추가 중" : "항목 추가"}</UiText></button>
      </form>
      <ActionMessage state={state} />
    </> : <p className={styles.criterionLocked}><UiText>{"점수가 저장되어 평가 항목, 배점과 순서는 변경할 수 없습니다."}</UiText></p>}
    {rubric.criteria.length ? <ol className={styles.criteriaList}>{rubric.criteria.map((criterion, index) => <PersistedCriterionRow key={criterion.id} programId={programId} rubric={rubric} criterion={criterion} index={index} editable={editable} />)}</ol> : <p className={styles.empty}><UiText>{"아직 평가 항목이 없습니다."}</UiText></p>}
  </section>;
}

function PersistedCriterionRow({ programId, rubric, criterion, index, editable }: { programId: string; rubric: RubricRow; criterion: CriterionRow; index: number; editable: boolean }) {
  const [state, action, pending] = useActionState(updateCriterionAction.bind(null, criterion.id, rubric.id, programId), rubricInitialState);
  return <li className={styles.criterionItem}>
    {editable ? <div className={styles.criterionRow}>
      <form action={action} className={styles.criterionEdit}>
        <TextInput name="label" defaultValue={criterion.label} maxLength={60} required aria-label={`${index + 1}번째 평가 항목 이름`} />
        <TextInput name="maxPoints" type="number" min={1} max={100} defaultValue={criterion.maxPoints} required aria-label={`${index + 1}번째 평가 항목 배점`} />
        <button className="button-quiet text-xs" disabled={pending}><UiText>{"저장"}</UiText></button>
      </form>
      <div className={styles.rowActions}>
        <CriterionMove programId={programId} rubric={rubric} criterion={criterion} direction="up" disabled={index === 0} />
        <CriterionMove programId={programId} rubric={rubric} criterion={criterion} direction="down" disabled={index === rubric.criteria.length - 1} />
        <CriterionDelete programId={programId} rubric={rubric} criterion={criterion} />
      </div>
      <ActionMessage state={state} />
    </div> : <div className={styles.criterionRow}><strong>{criterion.label}</strong><span><UiText>{`${criterion.maxPoints}점`}</UiText></span></div>}
  </li>;
}

function CriterionMove({ programId, rubric, criterion, direction, disabled }: { programId: string; rubric: RubricRow; criterion: CriterionRow; direction: "up" | "down"; disabled: boolean }) {
  const [state, action, pending] = useActionState(moveCriterionAction.bind(null, criterion.id, rubric.id, programId, direction), rubricInitialState);
  const label = `${criterion.label} ${direction === "up" ? "위로" : "아래로"} 이동`;
  return <form action={action}><IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>{direction === "up" ? <ArrowUpIcon className="size-5" /> : <ArrowDownIcon className="size-5" />}</IconButton>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}

function CriterionDelete({ programId, rubric, criterion }: { programId: string; rubric: RubricRow; criterion: CriterionRow }) {
  const [state, action, pending] = useActionState(deleteCriterionAction.bind(null, criterion.id, rubric.id, programId), rubricInitialState);
  return <form action={action}><IconButton type="submit" className="text-[var(--danger)] hover:text-[var(--danger)]" disabled={pending} aria-label={`${criterion.label} 삭제`} title="삭제"><TrashIcon className="size-5" /></IconButton>{state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}</form>;
}
