"use client";

import { UiButton, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useActionState, useEffect, useRef } from "react";

import { createDiscussionPostAction } from "@/app/projects/[projectId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/projects/[projectId]/_lib/team-form-state";
import styles from "@/app/projects/[projectId]/_components/discussion-post-form.module.css";

export function DiscussionPostForm({
  teamId,
  projectId = teamId,
  authorName,
  scrollContainerId,
  latestPostId,
  autoScrollToLatest = false,
}: {
  teamId: string;
  projectId?: string;
  authorName: string;
  scrollContainerId?: string;
  latestPostId?: string;
  autoScrollToLatest?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createDiscussionPostAction, initialTeamActionState);
  const handledSuccessRef = useRef<typeof state | null>(null);

  useEffect(() => {
    if (state.status !== "success" || handledSuccessRef.current === state) return;
    handledSuccessRef.current = state;
    if (!autoScrollToLatest) router.replace(`/projects/${projectId}/discussion`);
  }, [autoScrollToLatest, projectId, router, state]);

  useEffect(() => {
    if (!autoScrollToLatest || !scrollContainerId) return;
    const timer = window.setTimeout(() => {
      const container = document.getElementById(scrollContainerId);
      if (container) container.scrollTop = container.scrollHeight;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoScrollToLatest, latestPostId, scrollContainerId]);

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || pending) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form action={action} className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4">
      <input type="hidden" name="teamId" value={teamId} />
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-track)] text-[var(--accent-ink)]">
          <svg viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]" strokeLinecap="round">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 20c.4-4.2 2.6-6.2 6.5-6.2s6.1 2 6.5 6.2" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="discussion-message" className="sr-only"><UiText>{"메시지"}</UiText></label>
          <div className="flex items-end gap-2 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface)] p-1.5 pl-3.5 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]">
            <UiTextarea
              id="discussion-message"
              name="content"
              required
              maxLength={2000}
              rows={2}
              placeholder={`${authorName}님의 메시지 입력`}
              onKeyDown={submitOnEnter}
              className={`${styles.input} min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]`}
            />
            <UiButton type="submit" disabled={pending} className="button-primary min-h-9 shrink-0 px-2.5" aria-label={pending ? "메시지 전송 중" : "메시지 보내기"}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]" strokeLinecap="round" strokeLinejoin="round">
                <path d="m4 5 16 7-16 7 3-7-3-7Z" />
                <path d="M7 12h13" />
              </svg>
            </UiButton>
          </div>
          {state.message ? <p aria-live="polite" className={`mt-2 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
        </div>
      </div>
    </form>
  );
}
