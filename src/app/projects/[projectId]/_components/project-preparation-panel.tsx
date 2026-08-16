"use client";

import { useActionState, useState } from "react";

import { withdrawTopicApprovalAction } from "@/app/_actions/topic-approval-actions";
import { updateProjectPreparationAction, type ProjectPreparationActionState } from "@/app/projects/[projectId]/_actions/project-preparation-actions";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";

const initialState: ProjectPreparationActionState = { status: "idle", message: "" };

type Member = { id: string; name: string; role: "LEADER" | "MEMBER" };

export function ProjectPreparationPanel({
  projectId,
  projectTeamName,
  title,
  description,
  members,
  canManage,
}: {
  projectId: string;
  projectTeamName: string;
  title: string;
  description: string;
  members: Member[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(updateProjectPreparationAction, initialState);
  const [withdrawState, withdrawAction, withdrawing] = useActionState(withdrawTopicApprovalAction, initialState);
  const [representativeId, setRepresentativeId] = useState(members.find(({ role }) => role === "LEADER")?.id ?? "");
  const representative = members.find(({ id }) => id === representativeId);

  return (
    <section aria-labelledby="project-preparation-title" className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="eyebrow"><UiText>{"승인 대기"}</UiText></p>
        <h1 id="project-preparation-title" className="mt-2 text-3xl font-bold tracking-[-0.045em]"><UiText>{"프로젝트 준비"}</UiText></h1>
        <p className="muted mt-3 text-sm leading-6"><UiText>{"승인 전에는 팀 구성, 프로젝트 정보와 대표자만 확인할 수 있습니다."}</UiText></p>
      </header>

      <form action={action} className="panel grid gap-6 p-5 sm:p-7">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-5">
          <div>
            <h2 className="text-lg font-bold"><UiText>{"프로젝트 팀"}</UiText></h2>
            <p className="muted mt-1 text-sm"><UiText>{"승인되면 이 팀 구성이 그대로 실행팀이 됩니다."}</UiText></p>
          </div>
          <span className="rounded-full bg-[var(--warning-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--warning)]"><UiText>{"검토 중"}</UiText></span>
        </div>

        <label className="grid gap-2 text-sm font-semibold">
          <span><UiText>{"프로젝트 팀명"}</UiText></span>
          {canManage ? <UiInput name="projectTeamName" className="form-control" defaultValue={projectTeamName} maxLength={100} required disabled={pending} /> : <span className="form-control flex items-center bg-[var(--surface-subtle)]">{projectTeamName}</span>}
        </label>

        <div className="grid gap-3">
          <p className="text-sm font-semibold"><UiText>{"팀원"}</UiText></p>
          <ul className="flex flex-wrap gap-2">
            {members.map((member) => <li key={member.id} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${member.id === representativeId ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary-hover)]" : "border-[var(--line)] bg-[var(--surface)]"}`}><UiText>{member.name}</UiText>{member.id === representativeId ? <span className="ml-1.5 text-xs"><UiText>{"대표"}</UiText></span> : null}</li>)}
          </ul>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 text-sm font-semibold">
            <span><UiText>{"프로젝트 대표"}</UiText></span>
            {canManage ? <CustomSelect name="projectRepresentativeId" ariaLabel="프로젝트 대표" value={representativeId} onValueChange={setRepresentativeId} options={members.map((member) => ({ value: member.id, label: member.name }))} required /> : <span className="form-control flex items-center bg-[var(--surface-subtle)]">{representative?.name ?? "-"}</span>}
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--line)] pt-6">
          <label className="grid gap-2 text-sm font-semibold">
            <span><UiText>{"프로젝트명"}</UiText></span>
            {canManage ? <UiInput name="title" className="form-control" defaultValue={title} maxLength={200} required disabled={pending} /> : <span className="form-control flex items-center bg-[var(--surface-subtle)]">{title}</span>}
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            <span><UiText>{"프로젝트 설명"}</UiText></span>
            {canManage ? <UiTextarea name="description" className="form-control min-h-36 resize-y leading-7" defaultValue={description} maxLength={8_000} required disabled={pending} /> : <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]">{description}</p>}
          </label>
        </div>

        {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
        {state.status === "success" ? <p role="status" className="text-sm font-semibold text-[var(--success)]"><UiText>{state.message}</UiText></p> : null}
        {canManage ? <div className="flex justify-end border-t border-[var(--line)] pt-5"><button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "저장 중" : "준비 정보 저장"}</UiText></button></div> : <p className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--muted)]"><UiText>{"프로젝트를 등록한 팀장만 준비 정보를 수정할 수 있습니다."}</UiText></p>}
      </form>

      {canManage ? <form action={withdrawAction} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
        <input type="hidden" name="projectId" value={projectId} />
        <div>
          <p className="text-sm font-semibold"><UiText>{"프로젝트 등록 철회"}</UiText></p>
          <p className="muted mt-1 text-sm"><UiText>{"철회하면 승인 대기 프로젝트 팀과 준비 정보가 삭제됩니다."}</UiText></p>
          {withdrawState.status === "error" ? <p role="alert" className="mt-2 text-sm font-semibold text-[var(--danger)]"><UiText>{withdrawState.message}</UiText></p> : null}
          {withdrawState.status === "success" ? <p role="status" className="mt-2 text-sm font-semibold text-[var(--success)]"><UiText>{withdrawState.message}</UiText></p> : null}
        </div>
        <button type="submit" className="button-secondary text-[var(--danger)]" disabled={withdrawing}><UiText>{withdrawing ? "철회 중" : "프로젝트 등록 철회"}</UiText></button>
      </form> : null}
    </section>
  );
}
