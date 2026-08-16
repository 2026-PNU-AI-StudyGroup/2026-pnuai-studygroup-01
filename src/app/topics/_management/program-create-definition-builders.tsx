"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/topics/_management/program-create-definition-builders.module.css";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { DateTimeInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { AddIcon, ArrowDownIcon, ArrowUpIcon, CloseIcon, TrashIcon } from "@/shared/ui/workspace-icons";

export type ProgramCreateCriterionDraft = { id: string; label: string; maxPoints: number };
export type ProgramCreateRubricDraft = {
  id: string;
  divisionName: string | null;
  title: string;
  gradingDueAt: string;
  audience: "STAFF_ONLY" | "TEAM_MEMBERS";
  criteria: ProgramCreateCriterionDraft[];
};
export type ProgramCreateReportDraft = { id: string; title: string; dueAt: string; required: boolean };

const audienceOptions = [
  { value: "STAFF_ONLY", label: "관계자 전용", description: "관리자와 담당 교수·조교만 확인" },
  { value: "TEAM_MEMBERS", label: "팀원 공개", description: "채점 마감 후 팀원에게 공개" },
];

let draftSequence = 0;
function draftId(prefix: string) {
  draftSequence += 1;
  return `${prefix}-${draftSequence}`;
}

function move<T>(items: T[], index: number, direction: "up" | "down") {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function dateLabel(value: string) {
  if (!value) return "마감 미설정";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function ItemActions({ title, index, length, onMove, onDelete, deleteLabel }: {
  title: string;
  index: number;
  length: number;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <div className={styles.itemActions}>
      <IconButton type="button" onClick={() => onMove("up")} disabled={index === 0} aria-label={`${title} 위로 이동`} title="위로 이동"><ArrowUpIcon className="size-5" /></IconButton>
      <IconButton type="button" onClick={() => onMove("down")} disabled={index === length - 1} aria-label={`${title} 아래로 이동`} title="아래로 이동"><ArrowDownIcon className="size-5" /></IconButton>
      <IconButton type="button" onClick={onDelete} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label={`${title} ${deleteLabel}`} title={deleteLabel}><TrashIcon className="size-5" /></IconButton>
    </div>
  );
}

export function ProgramCreateRubricBuilder({ divisionNames, rubrics, onChange }: {
  divisionNames: string[];
  rubrics: ProgramCreateRubricDraft[];
  onChange: (rubrics: ProgramCreateRubricDraft[]) => void;
}) {
  const [divisionName, setDivisionName] = useState("");
  const [title, setTitle] = useState("");
  const [gradingDueAt, setGradingDueAt] = useState("");
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editingRubric = rubrics.find((rubric) => rubric.id === editingRubricId) ?? null;
  const scopeOptions = [
    { value: "", label: "공통 채점표", description: "모든 트랙과 미분류 프로젝트에 적용" },
    ...divisionNames.map((name) => ({ value: name, label: name, description: "이 트랙에만 적용" })),
  ];

  function addRubric() {
    if (!title.trim() || !gradingDueAt) return;
    const id = draftId("rubric");
    onChange([...rubrics, { id, divisionName: divisionName || null, title: title.trim(), gradingDueAt, audience: "STAFF_ONLY", criteria: [] }]);
    setDivisionName("");
    setTitle("");
    setGradingDueAt("");
  }

  function updateRubric(id: string, patch: Partial<ProgramCreateRubricDraft>) {
    onChange(rubrics.map((rubric) => rubric.id === id ? { ...rubric, ...patch } : rubric));
  }

  function closeRubricSettings() {
    setEditingRubricId(null);
    window.requestAnimationFrame(() => settingsTriggerRef.current?.focus());
  }

  return (
    <div className={styles.builder}>
      <div className={`${styles.quickAddRow} ${styles.rubricQuickAdd}`}>
        <label className={styles.field}><span><UiText>{"적용 범위"}</UiText></span><CustomSelect name="_newRubricScope" ariaLabel="새 채점표 적용 범위" value={divisionName} onValueChange={setDivisionName} options={scopeOptions} /></label>
        <label className={styles.field}><span><UiText>{"채점표 제목"}</UiText></span><UiInput value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="form-control" placeholder="예: 공식 평가" /></label>
        <label className={styles.field}><span><UiText>{"채점 마감"}</UiText></span><DateTimeInput value={gradingDueAt} onValueChange={setGradingDueAt} aria-label="새 채점표 채점 마감" /></label>
        <button type="button" className={`button-primary ${styles.addButton}`} onClick={addRubric} disabled={!title.trim() || !gradingDueAt}><AddIcon className="size-4" /><UiText>{"추가"}</UiText></button>
      </div>

      {rubrics.length ? <ol className={styles.definitionList}>{rubrics.map((rubric, index) => {
        const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
        const scopeLabel = rubric.divisionName ?? "공통 채점표";
        const audienceLabel = audienceOptions.find((option) => option.value === rubric.audience)?.label ?? "관계자 전용";
        return <li key={rubric.id} className={styles.definitionItem}>
          <div className={styles.itemSummary}>
            <div className={styles.itemMeta}><strong><UiText>{rubric.title}</UiText></strong><span><UiText>{`${scopeLabel} · ${dateLabel(rubric.gradingDueAt)} · ${audienceLabel} · 항목 ${rubric.criteria.length}개 / ${total}점`}</UiText></span></div>
            <div className={styles.summaryActions}>
              <button
                type="button"
                className={`button-secondary ${styles.settingsButton}`}
                onClick={(event) => {
                  settingsTriggerRef.current = event.currentTarget;
                  setEditingRubricId(rubric.id);
                }}
              >
                <UiText>{"세부 설정"}</UiText>
              </button>
              <ItemActions title={rubric.title} index={index} length={rubrics.length} onMove={(direction) => onChange(move(rubrics, index, direction))} onDelete={() => onChange(rubrics.filter(({ id }) => id !== rubric.id))} deleteLabel="채점표 삭제" />
            </div>
          </div>
        </li>;
      })}</ol> : <p className={styles.emptyState}><UiText>{"필요한 채점표만 추가할 수 있습니다."}</UiText></p>}
      {editingRubric ? <RubricSettingsDialog
        key={editingRubric.id}
        rubric={editingRubric}
        divisionNames={divisionNames}
        onSave={(nextRubric) => updateRubric(nextRubric.id, nextRubric)}
        onRequestClose={closeRubricSettings}
      /> : null}
    </div>
  );
}

function RubricSettingsDialog({ rubric, divisionNames, onSave, onRequestClose }: {
  rubric: ProgramCreateRubricDraft;
  divisionNames: string[];
  onSave: (rubric: ProgramCreateRubricDraft) => void;
  onRequestClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<ProgramCreateRubricDraft>(() => ({
    ...rubric,
    criteria: rubric.criteria.map((criterion) => ({ ...criterion })),
  }));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  if (typeof document === "undefined") return null;

  const currentDraft = draft;

  const scopeOptions = [
    { value: "", label: "공통 채점표", description: "모든 트랙과 미분류 프로젝트에 적용" },
    ...divisionNames.map((name) => ({ value: name, label: name, description: "이 트랙에만 적용" })),
  ];
  const hasCriteria = currentDraft.criteria.length > 0;
  const canSave = Boolean(currentDraft.title.trim() && currentDraft.gradingDueAt && hasCriteria);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.rubricDialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
    >
      <div className={styles.dialogSurface}>
        <header className={styles.dialogHeader}>
          <div>
            <h3 id={titleId}><UiText>{"채점표 세부 설정"}</UiText></h3>
          </div>
          <IconButton type="button" onClick={onRequestClose} aria-label="채점표 설정 닫기" title="닫기"><CloseIcon className="size-5" /></IconButton>
        </header>
        <div className={styles.dialogBody}>
          <div className={styles.rubricSettingsModal}>
            <label className={styles.field}><span><UiText>{"적용 범위"}</UiText></span><CustomSelect name={`_rubricScope_${currentDraft.id}`} ariaLabel={`${currentDraft.title} 적용 범위`} value={currentDraft.divisionName ?? ""} onValueChange={(value) => setDraft({ ...currentDraft, divisionName: value || null })} options={scopeOptions} /></label>
            <label className={styles.field}><span><UiText>{"채점표 제목"}</UiText></span><UiInput value={currentDraft.title} onChange={(event) => setDraft({ ...currentDraft, title: event.target.value })} maxLength={100} className="form-control" /></label>
            <label className={styles.field}><span><UiText>{"채점 마감"}</UiText></span><DateTimeInput value={currentDraft.gradingDueAt} onValueChange={(gradingDueAt) => setDraft({ ...currentDraft, gradingDueAt })} aria-label={`${currentDraft.title} 채점 마감`} /></label>
            <label className={styles.field}><span><UiText>{"점수 공개"}</UiText></span><CustomSelect name={`_rubricAudience_${currentDraft.id}`} ariaLabel={`${currentDraft.title} 점수 공개 대상`} value={currentDraft.audience} onValueChange={(audience) => setDraft({ ...currentDraft, audience: audience as ProgramCreateRubricDraft["audience"] })} options={audienceOptions} /></label>
          </div>
          <CriterionDraftEditor rubric={currentDraft} onChange={(criteria) => setDraft({ ...currentDraft, criteria })} />
          {!hasCriteria ? <p className={styles.criteriaRequirement} role="status"><UiText>{"채점표를 저장하려면 평가 항목을 하나 이상 추가해 주세요."}</UiText></p> : null}
        </div>
        <footer className={styles.dialogFooter}>
          <button type="button" className="button-secondary" onClick={onRequestClose}><UiText>{"취소"}</UiText></button>
          <button type="button" className="button-primary" disabled={!canSave} onClick={() => {
            if (!canSave) return;
            onSave({ ...currentDraft, title: currentDraft.title.trim() });
            onRequestClose();
          }}><UiText>{"저장"}</UiText></button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}

function CriterionDraftEditor({ rubric, onChange }: { rubric: ProgramCreateRubricDraft; onChange: (criteria: ProgramCreateCriterionDraft[]) => void }) {
  const [label, setLabel] = useState("");
  const [maxPoints, setMaxPoints] = useState(10);
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  function add() {
    if (!label.trim()) return;
    onChange([...rubric.criteria, { id: draftId("criterion"), label: label.trim(), maxPoints }]);
    setLabel("");
    setMaxPoints(10);
  }
  return (
    <section className={styles.criteria} aria-labelledby={`rubric-criteria-${rubric.id}`}>
      <header className={styles.criteriaHeader}>
        <h4 id={`rubric-criteria-${rubric.id}`}><UiText>{"평가 항목"}</UiText></h4>
        <span><UiText>{`${rubric.criteria.length}개 · 총점 ${total}점`}</UiText></span>
      </header>
      <div className={styles.criteriaBody}>
        <div className={styles.criteriaRow}>
          <label className={styles.field}><span><UiText>{"항목 이름"}</UiText></span><UiInput value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} className="form-control" placeholder="예: 문제 정의" /></label>
          <label className={`${styles.field} ${styles.scoreField}`}><span><UiText>{"배점"}</UiText></span><UiInput value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} type="number" min={1} max={100} className="form-control" /></label>
          <button type="button" className={`button-secondary ${styles.addButton}`} onClick={add} disabled={!label.trim()}><AddIcon className="size-4" /><UiText>{"추가"}</UiText></button>
        </div>
        {rubric.criteria.length ? <ol className={styles.criteriaList}>{rubric.criteria.map((criterion, index) => <li key={criterion.id} className={styles.criterionItem}>
          <div className={styles.criteriaRow}>
            <label className={styles.field}><span className="sr-only"><UiText>{"항목 이름"}</UiText></span><UiInput value={criterion.label} onChange={(event) => onChange(rubric.criteria.map((item) => item.id === criterion.id ? { ...item, label: event.target.value } : item))} maxLength={60} required className="form-control" aria-label={`${index + 1}번째 평가 항목 이름`} /></label>
            <label className={`${styles.field} ${styles.scoreField}`}><span className="sr-only"><UiText>{"배점"}</UiText></span><UiInput value={criterion.maxPoints} onChange={(event) => onChange(rubric.criteria.map((item) => item.id === criterion.id ? { ...item, maxPoints: Number(event.target.value) } : item))} type="number" min={1} max={100} required className="form-control" aria-label={`${index + 1}번째 평가 항목 배점`} /></label>
            <ItemActions title={criterion.label} index={index} length={rubric.criteria.length} onMove={(direction) => onChange(move(rubric.criteria, index, direction))} onDelete={() => onChange(rubric.criteria.filter(({ id }) => id !== criterion.id))} deleteLabel="삭제" />
          </div>
        </li>)}</ol> : null}
      </div>
    </section>
  );
}

export function ProgramCreateReportBuilder({ reports, onChange }: { reports: ProgramCreateReportDraft[]; onChange: (reports: ProgramCreateReportDraft[]) => void }) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [required, setRequired] = useState(true);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editingReport = reports.find((report) => report.id === editingReportId) ?? null;

  function add() {
    if (!title.trim() || !dueAt) return;
    const id = draftId("report");
    onChange([...reports, { id, title: title.trim(), dueAt, required }]);
    setTitle("");
    setDueAt("");
    setRequired(true);
  }

  function updateReport(id: string, patch: Partial<ProgramCreateReportDraft>) {
    onChange(reports.map((report) => report.id === id ? { ...report, ...patch } : report));
  }

  function closeReportSettings() {
    setEditingReportId(null);
    window.requestAnimationFrame(() => settingsTriggerRef.current?.focus());
  }

  return (
    <div className={styles.builder}>
      <div className={`${styles.quickAddRow} ${styles.reportQuickAdd}`}>
        <label className={styles.field}><span><UiText>{"보고서 제목"}</UiText></span><UiInput value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="form-control" placeholder="예: 요구사항 분석 보고서" /></label>
        <label className={styles.field}><span><UiText>{"제출 마감"}</UiText></span><DateTimeInput value={dueAt} onValueChange={setDueAt} aria-label="새 보고서 제출 마감" /></label>
        <label className={styles.field}><span><UiText>{"제출 구분"}</UiText></span><CustomSelect name="_newReportRequired" ariaLabel="새 보고서 제출 구분" value={String(required)} onValueChange={(value) => setRequired(value === "true")} options={[{ value: "true", label: "필수 제출" }, { value: "false", label: "선택 제출" }]} /></label>
        <button type="button" className={`button-primary ${styles.addButton}`} onClick={add} disabled={!title.trim() || !dueAt}><AddIcon className="size-4" /><UiText>{"추가"}</UiText></button>
      </div>
      {reports.length ? <ol className={styles.definitionList}>{reports.map((report, index) => <li key={report.id} className={styles.definitionItem}>
        <div className={styles.itemSummary}>
          <div className={styles.itemMeta}><strong><UiText>{report.title}</UiText></strong><span><UiText>{`${report.required ? "필수 제출" : "선택 제출"} · 제출 마감 ${dateLabel(report.dueAt)}`}</UiText></span></div>
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={`button-secondary ${styles.settingsButton}`}
              onClick={(event) => {
                settingsTriggerRef.current = event.currentTarget;
                setEditingReportId(report.id);
              }}
            >
              <UiText>{"수정"}</UiText>
            </button>
            <ItemActions title={report.title} index={index} length={reports.length} onMove={(direction) => onChange(move(reports, index, direction))} onDelete={() => onChange(reports.filter(({ id }) => id !== report.id))} deleteLabel="보고서 삭제" />
          </div>
        </div>
      </li>)}</ol> : <p className={styles.emptyState}><UiText>{"필요한 보고서만 추가할 수 있습니다."}</UiText></p>}
      {editingReport ? <ReportSettingsDialog
        key={editingReport.id}
        report={editingReport}
        onSave={(nextReport) => updateReport(nextReport.id, nextReport)}
        onRequestClose={closeReportSettings}
      /> : null}
    </div>
  );
}

function ReportSettingsDialog({ report, onSave, onRequestClose }: {
  report: ProgramCreateReportDraft;
  onSave: (report: ProgramCreateReportDraft) => void;
  onRequestClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<ProgramCreateReportDraft>(() => ({ ...report }));
  const canSave = Boolean(draft.title.trim() && draft.dueAt);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.rubricDialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
    >
      <div className={styles.dialogSurface}>
        <header className={styles.dialogHeader}>
          <h3 id={titleId}><UiText>{"보고서 수정"}</UiText></h3>
          <IconButton type="button" onClick={onRequestClose} aria-label="보고서 수정 닫기" title="닫기"><CloseIcon className="size-5" /></IconButton>
        </header>
        <div className={styles.dialogBody}>
          <div className={styles.reportSettings}>
            <label className={styles.field}><span><UiText>{"보고서 제목"}</UiText></span><UiInput value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={100} className="form-control" /></label>
            <label className={styles.field}><span><UiText>{"제출 마감"}</UiText></span><DateTimeInput value={draft.dueAt} onValueChange={(dueAt) => setDraft({ ...draft, dueAt })} aria-label={`${draft.title} 제출 마감`} /></label>
            <label className={styles.field}><span><UiText>{"제출 구분"}</UiText></span><CustomSelect name={`_reportRequired_${draft.id}`} ariaLabel={`${draft.title} 제출 구분`} value={String(draft.required)} onValueChange={(value) => setDraft({ ...draft, required: value === "true" })} options={[{ value: "true", label: "필수 제출" }, { value: "false", label: "선택 제출" }]} /></label>
          </div>
        </div>
        <footer className={styles.dialogFooter}>
          <button type="button" className="button-secondary" onClick={onRequestClose}><UiText>{"취소"}</UiText></button>
          <button type="button" className="button-primary" disabled={!canSave} onClick={() => {
            if (!canSave) return;
            onSave({ ...draft, title: draft.title.trim() });
            onRequestClose();
          }}><UiText>{"저장"}</UiText></button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
