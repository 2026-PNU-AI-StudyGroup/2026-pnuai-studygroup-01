"use client";

import { useActionState } from "react";

import {
  archiveRubricAction,
  createCriterionAction,
  createRubricAction,
  deleteCriterionAction,
  moveCriterionAction,
  moveRubricAction,
  rubricInitialState,
  setDivisionRubricModeAction,
  updateRubricAction,
  updateCriterionAction,
} from "@/app/admin/programs/[programId]/rubric/_actions/rubric-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
import { StatusBadge } from "@/shared/ui/page-primitives";

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

const audienceOptions = [
  { value: "STAFF_ONLY", label: "관계자 전용", description: "관리자와 담당 교수·조교만 확인" },
  { value: "TEAM_MEMBERS", label: "팀원 공개", description: "채점 완료 후 마감 시각부터 팀원에게 공개" },
];

function ActionMessage({ state }: { state: { status: string; message: string } }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null;
}

function NewRubricForm({ programId, divisionId }: { programId: string; divisionId: string | null }) {
  const [state, action, pending] = useActionState(createRubricAction.bind(null, programId, divisionId), rubricInitialState);
  return (
    <form action={action} className="grid gap-3 rounded-2xl bg-[var(--surface-subtle)] p-4 md:grid-cols-[minmax(12rem,1fr)_minmax(13rem,1fr)_minmax(12rem,1fr)_auto] md:items-end">
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"채점표 제목"}</UiText><UiInput name="title" maxLength={100} required className="form-control bg-white" placeholder="예: 공식 평가" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"채점 마감"}</UiText><UiInput name="gradingDueAt" type="datetime-local" required className="form-control bg-white" /></label>
      <label className="grid gap-2 text-sm font-semibold"><UiText>{"점수 공개"}</UiText><CustomSelect name="audience" ariaLabel="점수 공개 대상" defaultValue="STAFF_ONLY" options={audienceOptions} /></label>
      <button className="button-primary" disabled={pending}><UiText>{pending ? "추가 중" : "채점표 추가"}</UiText></button>
      <div className="md:col-span-4"><ActionMessage state={state} /></div>
    </form>
  );
}

function CriterionManager({ programId, rubric }: { programId: string; rubric: RubricRow }) {
  const editable = rubric.scoreCount === 0;
  const [state, action, pending] = useActionState(createCriterionAction.bind(null, rubric.id, programId), rubricInitialState);
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return (
    <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold"><UiText>{"항목 이름"}</UiText><UiInput name="label" form={`criterion-${rubric.id}`} maxLength={60} required disabled={!editable} className="form-control bg-white" /></label>
        <label className="grid gap-1 text-xs font-semibold"><UiText>{"배점"}</UiText><UiInput name="maxPoints" form={`criterion-${rubric.id}`} type="number" min={1} max={100} defaultValue={10} required disabled={!editable} className="form-control w-24 bg-white" /></label>
        <form id={`criterion-${rubric.id}`} action={action}><button className="button-secondary" disabled={pending || !editable}><UiText>{pending ? "추가 중" : "항목 추가"}</UiText></button></form>
        <span className="ml-auto text-sm font-bold"><UiText>{"총점"}</UiText>{` ${total}점`}</span>
      </div>
      <ActionMessage state={state} />
      {!editable ? <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"첫 점수가 저장되어 항목·배점·순서가 고정되었습니다."}</UiText></p> : null}
      {rubric.criteria.length ? (
        <ul className="divide-y divide-[var(--line)]">
          {rubric.criteria.map((criterion, index) => (
            <li key={criterion.id} className="flex flex-wrap items-end justify-between gap-2 py-2 text-sm">
              <form action={async (formData) => { await updateCriterionAction(criterion.id, rubric.id, programId, rubricInitialState, formData); }} className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs font-semibold"><UiText>{"항목"}</UiText><UiInput name="label" defaultValue={criterion.label} maxLength={60} required disabled={!editable} className="form-control" /></label>
                <label className="grid gap-1 text-xs font-semibold"><UiText>{"배점"}</UiText><UiInput name="maxPoints" type="number" min={1} max={100} defaultValue={criterion.maxPoints} required disabled={!editable} className="form-control w-24" /></label>
                <button className="button-quiet text-xs" disabled={!editable}><UiText>{"저장"}</UiText></button>
              </form>
              <div className="flex gap-1">
                <form action={async () => { await moveCriterionAction(criterion.id, rubric.id, programId, "up", rubricInitialState); }}><button className="button-quiet text-xs" disabled={!editable || index === 0}><UiText>{"위로"}</UiText></button></form>
                <form action={async () => { await moveCriterionAction(criterion.id, rubric.id, programId, "down", rubricInitialState); }}><button className="button-quiet text-xs" disabled={!editable || index === rubric.criteria.length - 1}><UiText>{"아래로"}</UiText></button></form>
                <form action={async () => { await deleteCriterionAction(criterion.id, rubric.id, programId, rubricInitialState); }}><button className="button-quiet text-xs text-[var(--danger)]" disabled={!editable}><UiText>{"삭제"}</UiText></button></form>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-[var(--muted)]"><UiText>{"채점 항목을 추가해 주세요."}</UiText></p>}
    </div>
  );
}

function RubricCard({ programId, rubric, index, count }: { programId: string; rubric: RubricRow; index: number; count: number }) {
  const [state, action, pending] = useActionState(updateRubricAction.bind(null, rubric.id, programId), rubricInitialState);
  const [archiveState, archiveAction, archiving] = useActionState(archiveRubricAction.bind(null, rubric.id, programId), rubricInitialState);
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <form action={action} className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(13rem,1fr)_minmax(12rem,1fr)_auto] md:items-end">
        <label className="grid gap-2 text-sm font-semibold"><UiText>{"제목"}</UiText><UiInput name="title" defaultValue={rubric.title} readOnly={rubric.scoreCount > 0} maxLength={100} required className="form-control" /></label>
        <label className="grid gap-2 text-sm font-semibold"><UiText>{"채점 마감"}</UiText><UiInput name="gradingDueAt" type="datetime-local" defaultValue={koreanDateTimeInput(rubric.gradingDueAt)} required className="form-control" /></label>
        <label className="grid gap-2 text-sm font-semibold"><UiText>{"점수 공개"}</UiText><CustomSelect name="audience" ariaLabel="점수 공개 대상" defaultValue={rubric.audience} options={audienceOptions} /></label>
        <button className="button-secondary" disabled={pending}><UiText>{pending ? "저장 중" : "설정 저장"}</UiText></button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2"><StatusBadge tone={rubric.audience === "TEAM_MEMBERS" ? "success" : "neutral"}><UiText>{rubric.audience === "TEAM_MEMBERS" ? "팀원 공개" : "관계자 전용"}</UiText></StatusBadge>{rubric.scoreCount ? <StatusBadge tone="info"><UiText>{"구조 잠김"}</UiText></StatusBadge> : null}</div>
        <div className="flex gap-1">
          <form action={async () => { await moveRubricAction(rubric.id, programId, "up", rubricInitialState); }}><button className="button-quiet text-xs" disabled={rubric.scoreCount > 0 || index === 0}><UiText>{"위로"}</UiText></button></form>
          <form action={async () => { await moveRubricAction(rubric.id, programId, "down", rubricInitialState); }}><button className="button-quiet text-xs" disabled={rubric.scoreCount > 0 || index === count - 1}><UiText>{"아래로"}</UiText></button></form>
        <form action={archiveAction}><button className="button-quiet text-xs text-[var(--danger)]" disabled={archiving || rubric.scoreCount > 0}><UiText>{"채점표 삭제"}</UiText></button></form>
        </div>
      </div>
      <ActionMessage state={state.message ? state : archiveState} />
      <CriterionManager programId={programId} rubric={rubric} />
    </article>
  );
}

function DivisionMode({ programId, division }: { programId: string; division: RubricDivisionRow }) {
  const nextMode = division.rubricMode === "CUSTOM" ? "INHERIT_COMMON" : "CUSTOM";
  const [state, action, pending] = useActionState(setDivisionRubricModeAction.bind(null, programId, division.id, nextMode), rubricInitialState);
  return <div className="flex flex-wrap items-center gap-2"><form action={action}><button className="button-secondary" disabled={pending}><UiText>{division.rubricMode === "CUSTOM" ? "공통 상속으로 복귀" : "전용 채점표 사용"}</UiText></button></form><ActionMessage state={state} /></div>;
}

function Scope({ programId, title, description, divisionId, rubrics }: { programId: string; title: string; description: string; divisionId: string | null; rubrics: RubricRow[] }) {
  return (
    <section className="grid gap-4">
      <div><h3 className="text-lg font-bold"><UiText>{title}</UiText></h3><p className="mt-1 text-sm text-[var(--muted)]"><UiText>{description}</UiText></p></div>
      <NewRubricForm programId={programId} divisionId={divisionId} />
      {rubrics.length ? <div className="grid gap-3">{rubrics.map((rubric, index) => <RubricCard key={rubric.id} programId={programId} rubric={rubric} index={index} count={rubrics.length} />)}</div> : <p className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]"><UiText>{"설정된 채점표가 없습니다."}</UiText></p>}
    </section>
  );
}

export function RubricManager({ programId, divisions, rubrics }: { programId: string; divisions: RubricDivisionRow[]; rubrics: RubricRow[] }) {
  return (
    <div className="grid gap-8">
      <Scope programId={programId} title="공통 채점표" description="공통 상속 분과와 미분과 프로젝트에 모두 할당됩니다." divisionId={null} rubrics={rubrics.filter((rubric) => rubric.divisionId === null)} />
      {divisions.map((division) => (
        <section key={division.id} className="grid gap-4 border-t border-[var(--line)] pt-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{division.name}</h3><p className="mt-1 text-sm text-[var(--muted)]"><UiText>{division.rubricMode === "CUSTOM" ? "분과 전용 채점표를 사용합니다." : "공통 채점표 전체를 상속합니다."}</UiText></p></div><DivisionMode programId={programId} division={division} /></div>
          {division.rubricMode === "CUSTOM" ? <Scope programId={programId} title={`${division.name} 전용 채점표`} description="공통 채점표와 섞지 않고 이 목록 전체를 사용합니다." divisionId={division.id} rubrics={rubrics.filter((rubric) => rubric.divisionId === division.id)} /> : null}
        </section>
      ))}
    </div>
  );
}
