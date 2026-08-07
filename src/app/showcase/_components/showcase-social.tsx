"use client";

import { useActionState } from "react";

import {
  addShowcaseCommentAction,
  deleteShowcaseCommentAction,
  toggleShowcaseLikeAction,
} from "@/app/showcase/_actions/showcase-actions";
import { showcaseInitialState } from "@/app/showcase/_lib/showcase-options";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";

export type ShowcaseCommentView = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
};

export function ShowcaseLikeButton({ teamId, liked, count }: { teamId: string; liked: boolean; count: number }) {
  const [state, action, pending] = useActionState(toggleShowcaseLikeAction.bind(null, teamId), showcaseInitialState);
  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        aria-pressed={liked}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${liked ? "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
          <path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20Z" strokeLinejoin="round" />
        </svg>
        <UiText>{"좋아요"}</UiText>
        <span>{count}</span>
      </button>
      {state.status === "error" && state.message ? (
        <span className="text-xs font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></span>
      ) : null}
    </form>
  );
}

export function ShowcaseComments({
  teamId,
  comments,
  currentUserId,
  isAdmin,
}: {
  teamId: string;
  comments: ShowcaseCommentView[];
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(addShowcaseCommentAction.bind(null, teamId), showcaseInitialState);
  return (
    <section>
      <h2 className="text-xl font-bold tracking-[-0.02em]"><UiText>{"댓글"}</UiText>{" "}{comments.length}</h2>

      {currentUserId ? (
        <form action={action} className="mt-4 grid gap-2">
          <UiTextarea className="form-control min-h-20 bg-white leading-6" name="body" maxLength={1000} placeholder="응원이나 의견을 남겨 주세요." required />
          <div className="flex items-center gap-3">
            <button className="button-primary" type="submit" disabled={pending}>
              <UiText>{pending ? "등록 중" : "댓글 등록"}</UiText>
            </button>
            {state.message ? (
              <span className={`text-xs font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="muted mt-3 text-sm"><UiText>{"로그인하면 댓글을 남길 수 있습니다."}</UiText></p>
      )}

      {comments.length ? (
        <ul className="mt-5 grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-[var(--radius-control)] border border-[var(--line)] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">{comment.authorName}</span>
                  {" · "}
                  <UiDate value={comment.createdAt} mode="dateTime" />
                </p>
                {currentUserId === comment.authorId || isAdmin ? (
                  <form action={async (formData) => { await deleteShowcaseCommentAction(comment.id, showcaseInitialState, formData); }}>
                    <button className="button-quiet text-xs text-[var(--danger)]" type="submit"><UiText>{"삭제"}</UiText></button>
                  </form>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
