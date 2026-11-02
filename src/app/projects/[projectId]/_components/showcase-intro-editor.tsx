"use client";

import { useActionState, useId, useState } from "react";

import { saveShowcaseIntroAction, type ReportActionState } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { renderMarkdown } from "@/shared/ui/render-markdown";
import { FormSection, rowActionClass } from "@/app/projects/[projectId]/_components/workspace-page-header";

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
    <FormSection
      id={titleId}
      title={<UiText>{"프로젝트 소개"}</UiText>}
      description={<UiText>{"프로젝트 상세 화면에 그대로 실립니다. 마크다운을 쓸 수 있습니다."}</UiText>}
      aside={canManage && draft.trim() ? (
        <button type="button" className={rowActionClass} onClick={() => setPreview((current) => !current)}>
          <UiText>{preview ? "이어서 작성" : "미리보기"}</UiText>
        </button>
      ) : null}
    >

      {!canManage ? (
        intro.trim()
          ? <div className="space-y-3 text-sm leading-6 text-[var(--ink)]">{renderMarkdown(intro)}</div>
          : <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"팀이 프로젝트 소개를 작성하면 이곳에 표시됩니다."}</UiText></p>
      ) : (
        // 미리보기로 바꿔도 폼은 그대로 둔다. 화면 아래 "전체 저장"이 이 폼의 값을 읽어 간다.
        <form action={action} data-showcase-form="" className="grid gap-3">
          <input type="hidden" name="teamId" value={teamId} />
          {preview ? (
            <>
              <div className="space-y-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
                {renderMarkdown(draft)}
              </div>
              <input type="hidden" name="intro" value={draft} />
            </>
          ) : (
            <UiTextarea
              name="intro"
              className="form-control min-h-48 bg-[var(--surface)] text-sm leading-6"
              maxLength={20_000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="어떤 문제를 풀었는지, 무엇을 만들었는지 적어 주세요. ## 제목, **굵게**, - 목록을 쓸 수 있습니다."
            />
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p aria-live="polite" className={`mr-auto text-[0.8125rem] font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              {state.message ? <UiText>{state.message}</UiText> : null}
            </p>
            <button type="submit" className={`${rowActionClass} shrink-0`} disabled={pending}>
              <UiText>{pending ? "저장 중" : "소개 저장"}</UiText>
            </button>
          </div>
        </form>
      )}
    </FormSection>
  );
}
