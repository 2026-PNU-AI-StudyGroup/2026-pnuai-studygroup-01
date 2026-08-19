"use client";

import { useActionState, useId, useState } from "react";

import { saveShowcaseIntroAction, type ReportActionState } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { renderMarkdown } from "@/shared/ui/render-markdown";

const initialState: ReportActionState = { status: "idle", message: "" };

export function ShowcaseIntroEditor({ teamId, intro = "", canManage }: {
  teamId: string;
  intro?: string;
  canManage: boolean;
}) {
  const titleId = useId();
  const [state, action, pending] = useActionState(saveShowcaseIntroAction, initialState);
  const [draft, setDraft] = useState(intro);
  const [preview, setPreview] = useState(false);

  return (
    <section aria-labelledby={titleId} className="space-y-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-extrabold tracking-[-0.02em]"><UiText>{"프로젝트 소개"}</UiText></h2>
          <p className="muted mt-1 text-sm leading-6"><UiText>{"프로젝트 상세 화면에 그대로 실립니다. 마크다운을 쓸 수 있습니다."}</UiText></p>
        </div>
        {canManage && draft.trim() ? (
          <button type="button" className="button-quiet shrink-0" onClick={() => setPreview((current) => !current)}>
            <UiText>{preview ? "이어서 작성" : "미리보기"}</UiText>
          </button>
        ) : null}
      </div>

      {!canManage ? (
        intro.trim()
          ? <div className="space-y-3 text-[0.9375rem] leading-7 text-[var(--ink)]">{renderMarkdown(intro)}</div>
          : <p className="muted text-sm leading-6"><UiText>{"팀이 프로젝트 소개를 작성하면 이곳에 표시됩니다."}</UiText></p>
      ) : (
        // 미리보기로 바꿔도 폼은 그대로 둔다. 화면 아래 "전체 저장"이 이 폼의 값을 읽어 간다.
        <form action={action} data-showcase-form="" className="grid gap-3">
          <input type="hidden" name="teamId" value={teamId} />
          {preview ? (
            <>
              <div className="space-y-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-[0.9375rem] leading-7 text-[var(--ink)]">
                {renderMarkdown(draft)}
              </div>
              <input type="hidden" name="intro" value={draft} />
            </>
          ) : (
            <UiTextarea
              name="intro"
              className="form-control min-h-56 bg-[var(--surface)] leading-7"
              maxLength={20_000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="어떤 문제를 풀었는지, 무엇을 만들었는지 적어 주세요. ## 제목, **굵게**, - 목록을 쓸 수 있습니다."
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              {state.message ? <UiText>{state.message}</UiText> : null}
            </p>
            <button type="submit" className="button-primary shrink-0" disabled={pending}>
              <UiText>{pending ? "저장 중" : "소개 저장"}</UiText>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
