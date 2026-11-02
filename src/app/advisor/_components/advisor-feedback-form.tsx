"use client";

import { useActionState } from "react";

import { addAdvisorFeedbackAction, type AdvisorReviewState } from "@/app/advisor/_actions/advisor-review-actions";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";

const initialState: AdvisorReviewState = { status: "idle", message: "" };

/** 피드백 카드. 새 글 쓰는 칸을 위에, 이미 남긴 글을 최근 것부터 그 아래에 둔다. */
export function AdvisorFeedbackForm({
  topicId,
  feedback,
  readOnly,
}: {
  topicId: string;
  feedback: Array<{ id: string; body: string; createdAt: Date }>;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(addAdvisorFeedbackAction, initialState);

  return (
    <section aria-labelledby="advisor-project-feedback" className={cardClass}>
      <CardHead id="advisor-project-feedback" title={<UiText>{"피드백"}</UiText>} count={<>{feedback.length}<UiText>{"건"}</UiText></>} />
      {readOnly ? (
        <p className="px-5 pb-3 text-[0.8125rem] text-[var(--muted)]"><UiText>{"프로그램이 종료되어 더 이상 작성할 수 없습니다."}</UiText></p>
      ) : (
        <form action={action} className="grid gap-2 px-5 pb-4">
          <input type="hidden" name="topicId" value={topicId} />
          <label htmlFor="advisor-feedback-body" className="text-sm font-medium text-[var(--ink)]"><UiText>{"팀에 남길 피드백"}</UiText></label>
          <UiTextarea
            id="advisor-feedback-body"
            name="body"
            required
            maxLength={4000}
            rows={4}
            placeholder="팀에 전달할 피드백을 작성해 주세요."
            className="form-control resize-y text-sm"
          />
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {state.message ? (
              <p role={state.status === "error" ? "alert" : "status"} className={`mr-auto text-[0.8125rem] font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                <UiText>{state.message}</UiText>
              </p>
            ) : null}
            <button className="button-secondary button-compact font-medium" disabled={pending}><UiText>{pending ? "등록 중" : "피드백 등록"}</UiText></button>
          </div>
        </form>
      )}
      {feedback.length === 0 ? (
        <p className="border-t border-[var(--line)] px-5 py-3 text-[0.8125rem] text-[var(--muted)]"><UiText>{"작성한 피드백이 없습니다."}</UiText></p>
      ) : (
        <ul>
          {feedback.map((entry) => (
            <li key={entry.id} className="border-t border-[var(--line)] px-5 py-3">
              <time className="text-xs tabular-nums text-[var(--muted)]" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time>
              {/* 팀 평가 탭과 같은 마크다운 렌더를 써서 작성자가 본 그대로 보이게 한다. */}
              <LocalizedMarkdown text={entry.body} className="mt-1 space-y-2 text-sm leading-6 text-[var(--ink)] [overflow-wrap:anywhere]" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
