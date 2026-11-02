"use client";

import { useActionState, useState } from "react";

import {
  deleteProjectAction,
  type ProjectDeleteActionState,
} from "@/app/projects/[projectId]/_actions/project-delete-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TextInput } from "@/shared/ui/form-system";

const initialState: ProjectDeleteActionState = { status: "idle", message: "" };

// 되돌릴 수 없는 삭제다. 확인 문구 대신 프로젝트명을 직접 입력하게 해서 실수를 막는다.
export function ProjectDeleteForm({ topicId, title }: { topicId: string; title: string }) {
  const [state, action, pending] = useActionState(deleteProjectAction, initialState);
  const [confirmedTitle, setConfirmedTitle] = useState("");
  const [reason, setReason] = useState("");
  const ready = confirmedTitle.trim() === title.trim() && reason.trim().length > 0;

  return (
    <section aria-labelledby="project-delete-form-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 pb-5 pt-4">
      <h2 id="project-delete-form-title" className="text-base font-semibold text-[var(--ink)]">
        <UiText>{"삭제 확인"}</UiText>
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--muted)]">
        <UiText>{"팀, 팀원, 할 일, 팀 대화, 보고서, 결과물이 함께 삭제되며 되돌릴 수 없습니다. 무엇을 왜 지웠는지는 관리 이력에 남습니다."}</UiText>
      </p>
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="topicId" value={topicId} />
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          <UiText>{"삭제 사유"}</UiText>
          <TextInput
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            required
            placeholder="예: 테스트로 만든 프로젝트 정리"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          <UiText>{"확인을 위해 프로젝트명을 입력하세요"}</UiText>
          <TextInput
            name="confirmedTitle"
            value={confirmedTitle}
            onChange={(event) => setConfirmedTitle(event.target.value)}
            maxLength={200}
            required
            placeholder={title}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" role={state.status === "error" ? "alert" : undefined} className="text-[0.8125rem] font-medium text-[var(--danger)]">
            {state.message ? <UiText>{state.message}</UiText> : null}
          </p>
          <button type="submit" className="button-danger button-compact min-h-8 shrink-0 px-3 font-medium" disabled={pending || !ready}>
            <UiText>{pending ? "삭제 중" : "프로젝트 영구 삭제"}</UiText>
          </button>
        </div>
      </form>
    </section>
  );
}
