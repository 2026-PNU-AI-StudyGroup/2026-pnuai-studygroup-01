"use client";

import { useState } from "react";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { DateTimeInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { AddIcon, ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@/shared/ui/workspace-icons";

export type ProgramCreateCriterionDraft = { id: string; label: string; maxPoints: number };
export type ProgramCreateRubricDraft = {
  id: string;
  divisionName: string | null;
  title: string;
  gradingDueAt: string;
  audience: "STAFF_ONLY" | "TEAM_MEMBERS";
  criteria: ProgramCreateCriterionDraft[];
};
export type ProgramCreateReportDraft = { id: string; title: string; dueAt: string };

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

export function ProgramCreateRubricBuilder({ divisionNames, rubrics, onChange }: {
  divisionNames: string[];
  rubrics: ProgramCreateRubricDraft[];
  onChange: (rubrics: ProgramCreateRubricDraft[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [gradingDueAt, setGradingDueAt] = useState("");
  const [audience, setAudience] = useState<"STAFF_ONLY" | "TEAM_MEMBERS">("STAFF_ONLY");
  const [divisionName, setDivisionName] = useState("");
  const scopeOptions = [
    { value: "", label: "공통 채점표", description: "모든 분과와 미분과 프로젝트에 적용" },
    ...divisionNames.map((name) => ({ value: name, label: name, description: "이 분과에만 적용" })),
  ];

  function addRubric() {
    if (!title.trim() || !gradingDueAt) return;
    onChange([...rubrics, {
      id: draftId("rubric"),
      divisionName: divisionName || null,
      title: title.trim(),
      gradingDueAt,
      audience,
      criteria: [],
    }]);
    setTitle("");
    setGradingDueAt("");
  }

  function updateRubric(id: string, patch: Partial<ProgramCreateRubricDraft>) {
    onChange(rubrics.map((rubric) => rubric.id === id ? { ...rubric, ...patch } : rubric));
  }

  return <div className="grid gap-5">
    <div className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-4 md:grid-cols-2 min-[1400px]:grid-cols-[minmax(10rem,.8fr)_minmax(12rem,1fr)_minmax(13rem,1fr)_minmax(12rem,.9fr)_auto] min-[1400px]:items-end">
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"적용 범위"}</UiText><CustomSelect name="_newRubricScope" ariaLabel="새 채점표 적용 범위" value={divisionName} onValueChange={setDivisionName} options={scopeOptions} /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"채점표 제목"}</UiText><UiInput value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="form-control bg-white" placeholder="예: 공식 평가" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"채점 마감"}</UiText><DateTimeInput value={gradingDueAt} onValueChange={setGradingDueAt} aria-label="새 채점표 채점 마감" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"점수 공개"}</UiText><CustomSelect name="_newRubricAudience" ariaLabel="새 채점표 점수 공개 대상" value={audience} onValueChange={(value) => setAudience(value as typeof audience)} options={audienceOptions} /></label>
      <button type="button" className="button-primary gap-2" onClick={addRubric} disabled={!title.trim() || !gradingDueAt}><AddIcon className="size-4" /><UiText>{"채점표 추가"}</UiText></button>
    </div>

    {rubrics.length ? <div className="grid gap-3">{rubrics.map((rubric, index) => (
      <article key={rubric.id} className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="grid gap-3 md:grid-cols-2 min-[1400px]:grid-cols-[minmax(10rem,.8fr)_minmax(12rem,1fr)_minmax(13rem,1fr)_minmax(12rem,.9fr)_auto] min-[1400px]:items-end">
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"적용 범위"}</UiText><CustomSelect name={`_rubricScope_${rubric.id}`} ariaLabel={`${rubric.title} 적용 범위`} value={rubric.divisionName ?? ""} onValueChange={(value) => updateRubric(rubric.id, { divisionName: value || null })} options={scopeOptions} /></label>
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"제목"}</UiText><UiInput value={rubric.title} onChange={(event) => updateRubric(rubric.id, { title: event.target.value })} maxLength={100} required className="form-control" /></label>
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"채점 마감"}</UiText><DateTimeInput value={rubric.gradingDueAt} onValueChange={(value) => updateRubric(rubric.id, { gradingDueAt: value })} aria-label={`${rubric.title} 채점 마감`} required /></label>
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"점수 공개"}</UiText><CustomSelect name={`_rubricAudience_${rubric.id}`} ariaLabel={`${rubric.title} 점수 공개 대상`} value={rubric.audience} onValueChange={(value) => updateRubric(rubric.id, { audience: value as ProgramCreateRubricDraft["audience"] })} options={audienceOptions} /></label>
          <div className="flex gap-1">
            <IconButton type="button" onClick={() => onChange(move(rubrics, index, "up"))} disabled={index === 0} aria-label={`${rubric.title} 위로 이동`} title="위로 이동"><ArrowUpIcon className="size-5" /></IconButton>
            <IconButton type="button" onClick={() => onChange(move(rubrics, index, "down"))} disabled={index === rubrics.length - 1} aria-label={`${rubric.title} 아래로 이동`} title="아래로 이동"><ArrowDownIcon className="size-5" /></IconButton>
            <IconButton type="button" onClick={() => onChange(rubrics.filter(({ id }) => id !== rubric.id))} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label={`${rubric.title} 채점표 삭제`} title="채점표 삭제"><TrashIcon className="size-5" /></IconButton>
          </div>
        </div>
        <CriterionDraftEditor rubric={rubric} onChange={(criteria) => updateRubric(rubric.id, { criteria })} />
      </article>
    ))}</div> : <p className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-5 text-sm text-[var(--muted)]"><UiText>{"아직 설정된 채점표가 없습니다."}</UiText></p>}
  </div>;
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
  return <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4">
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid min-w-48 flex-1 gap-1 text-xs font-semibold"><UiText>{"항목 이름"}</UiText><UiInput value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} className="form-control" /></label>
      <label className="grid gap-1 text-xs font-semibold"><UiText>{"배점"}</UiText><UiInput value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} type="number" min={1} max={100} className="form-control w-24" /></label>
      <button type="button" className="button-secondary gap-2" onClick={add} disabled={!label.trim()}><AddIcon className="size-4" /><UiText>{"항목 추가"}</UiText></button>
      <strong className="ml-auto text-sm"><UiText>{"총점"}</UiText>{` ${total}점`}</strong>
    </div>
    {rubric.criteria.length ? <ul className="divide-y divide-[var(--line)]">{rubric.criteria.map((criterion, index) => <li key={criterion.id} className="flex flex-wrap items-end justify-between gap-2 py-2">
      <div className="flex flex-1 flex-wrap gap-2">
        <label className="grid min-w-48 flex-1 gap-1 text-xs font-semibold"><UiText>{"항목"}</UiText><UiInput value={criterion.label} onChange={(event) => onChange(rubric.criteria.map((item) => item.id === criterion.id ? { ...item, label: event.target.value } : item))} maxLength={60} required className="form-control" /></label>
        <label className="grid gap-1 text-xs font-semibold"><UiText>{"배점"}</UiText><UiInput value={criterion.maxPoints} onChange={(event) => onChange(rubric.criteria.map((item) => item.id === criterion.id ? { ...item, maxPoints: Number(event.target.value) } : item))} type="number" min={1} max={100} required className="form-control w-24" /></label>
      </div>
      <div className="flex gap-1">
        <IconButton type="button" onClick={() => onChange(move(rubric.criteria, index, "up"))} disabled={index === 0} aria-label={`${criterion.label} 위로 이동`} title="위로 이동"><ArrowUpIcon className="size-5" /></IconButton>
        <IconButton type="button" onClick={() => onChange(move(rubric.criteria, index, "down"))} disabled={index === rubric.criteria.length - 1} aria-label={`${criterion.label} 아래로 이동`} title="아래로 이동"><ArrowDownIcon className="size-5" /></IconButton>
        <IconButton type="button" onClick={() => onChange(rubric.criteria.filter(({ id }) => id !== criterion.id))} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label={`${criterion.label} 삭제`} title="항목 삭제"><TrashIcon className="size-5" /></IconButton>
      </div>
    </li>)}</ul> : <p className="text-xs text-[var(--muted)]"><UiText>{"평가 항목과 배점을 추가해 주세요."}</UiText></p>}
  </div>;
}

export function ProgramCreateReportBuilder({ reports, onChange }: { reports: ProgramCreateReportDraft[]; onChange: (reports: ProgramCreateReportDraft[]) => void }) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  function add() {
    if (!title.trim() || !dueAt) return;
    onChange([...reports, { id: draftId("report"), title: title.trim(), dueAt }]);
    setTitle("");
    setDueAt("");
  }
  return <div className="grid gap-5">
    <div className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,.8fr)_auto] sm:items-end">
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"보고서 제목"}</UiText><UiInput value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="form-control bg-white" placeholder="예: 요구사항 분석 보고서" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"제출 마감"}</UiText><DateTimeInput value={dueAt} onValueChange={setDueAt} aria-label="새 보고서 제출 마감" /></label>
      <button type="button" className="button-primary gap-2" onClick={add} disabled={!title.trim() || !dueAt}><AddIcon className="size-4" /><UiText>{"보고서 추가"}</UiText></button>
    </div>
    {reports.length ? <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{reports.map((report, index) => <li key={report.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,.8fr)_auto] sm:items-end">
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"보고서 제목"}</UiText><UiInput value={report.title} onChange={(event) => onChange(reports.map((item) => item.id === report.id ? { ...item, title: event.target.value } : item))} maxLength={100} required className="form-control" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"제출 마감"}</UiText><DateTimeInput value={report.dueAt} onValueChange={(value) => onChange(reports.map((item) => item.id === report.id ? { ...item, dueAt: value } : item))} aria-label={`${report.title} 제출 마감`} required /></label>
      <div className="flex gap-1">
        <IconButton type="button" onClick={() => onChange(move(reports, index, "up"))} disabled={index === 0} aria-label={`${report.title} 위로 이동`} title="위로 이동"><ArrowUpIcon className="size-5" /></IconButton>
        <IconButton type="button" onClick={() => onChange(move(reports, index, "down"))} disabled={index === reports.length - 1} aria-label={`${report.title} 아래로 이동`} title="아래로 이동"><ArrowDownIcon className="size-5" /></IconButton>
        <IconButton type="button" onClick={() => onChange(reports.filter(({ id }) => id !== report.id))} className="text-[var(--danger)] hover:text-[var(--danger)]" aria-label={`${report.title} 삭제`} title="보고서 삭제"><TrashIcon className="size-5" /></IconButton>
      </div>
    </li>)}</ul> : <p className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-5 text-sm text-[var(--muted)]"><UiText>{"아직 제출 보고서가 없습니다."}</UiText></p>}
  </div>;
}
