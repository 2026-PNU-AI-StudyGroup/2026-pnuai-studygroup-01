"use client";

import { useActionState } from "react";

import {
  applyTopicAction,
  type ApplyTopicActionState,
} from "@/app/topics/actions";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";

const initialState: ApplyTopicActionState = { status: "idle", message: "" };

export function ApplyTopicForm({ topicId, profile }: { topicId: string; profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(applyTopicAction, initialState);

  return (
    <details className="group mt-6 max-w-2xl border-t border-[var(--line)] pt-2">
      <summary className="snap-color flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-[var(--accent)]">
        이 주제에 지원하기
        <span aria-hidden="true" className="group-open:rotate-180">↓</span>
      </summary>
      <form action={action} className="grid gap-3 rounded-r-lg border-l-2 border-[var(--accent)] bg-[var(--accent-subtle)] p-5">
      <input type="hidden" name="topicId" value={topicId} />
      <label className="grid gap-2 text-sm font-medium">보유 기술<input name="skills" maxLength={1000} required defaultValue={profile?.skills.join(", ")} className="field" placeholder="예: TypeScript, Python" /></label>
      <label className="grid gap-2 text-sm font-medium">희망 역할<input name="desiredRole" maxLength={500} required defaultValue={profile?.desiredRole} className="field" placeholder="예: 프론트엔드 개발" /></label>
      <label className="grid gap-2 text-sm font-medium">활동 가능 시간<input name="availability" maxLength={500} required defaultValue={profile?.availability} className="field" placeholder="예: 평일 18시 이후" /></label>
      <label className="grid gap-2 text-sm font-medium">
        지원 메시지
        <textarea
          name="message"
          maxLength={2000}
          required
          rows={3}
          className="field"
          placeholder="관심 분야와 참여 동기를 작성해 주세요."
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="button-primary justify-self-start"
      >
        {pending ? "지원 중" : "지원하기"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}
        >
          {state.message}
        </p>
      ) : null}
      </form>
    </details>
  );
}
