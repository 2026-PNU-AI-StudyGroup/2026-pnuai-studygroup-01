"use client";

import { useActionState, useId } from "react";

import { upsertShowcaseVideoAction, type ReportActionState } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TextInput } from "@/shared/ui/form-system";
import { ArtifactMedia } from "@/shared/ui/artifact-media";
import { VideoIcon } from "@/shared/ui/workspace-icons";

const initialState: ReportActionState = { status: "idle", message: "" };

export function ShowcaseVideoCard({
  teamId,
  video,
  canManage,
}: {
  teamId: string;
  video?: { id: string; title: string; externalUrl?: string };
  canManage: boolean;
}) {
  const titleId = useId();
  const [state, action, pending] = useActionState(upsertShowcaseVideoAction, initialState);

  return (
    <section aria-labelledby={titleId} className="space-y-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:p-6">
      <div>
        <h2 id={titleId} className="text-base font-extrabold tracking-[-0.02em]"><UiText>{"시연·발표 영상"}</UiText></h2>
        <p className="muted mt-1 text-sm leading-6"><UiText>{"YouTube 링크를 넣으면 프로젝트 상세 화면에서 바로 재생됩니다."}</UiText></p>
      </div>

      {/* 미리보기는 확인용이다. 편집 화면을 다 밀어낼 만큼 클 필요가 없다. */}
      <div className="max-w-md">
        {video?.externalUrl ? (
          <ArtifactMedia type="PRESENTATION_VIDEO" title={video.title} externalUrl={video.externalUrl} />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--muted)]">
            <VideoIcon className="size-7" />
            <p className="text-sm font-semibold"><UiText>{"등록된 영상이 없습니다"}</UiText></p>
          </div>
        )}
      </div>

      {canManage ? (
        <form action={action} data-showcase-form="" className="grid gap-3">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="type" value="PRESENTATION_VIDEO" />
          <label className="grid gap-2 text-sm font-semibold">
            <UiText>{"YouTube 링크"}</UiText>
            <TextInput name="externalUrl" type="url" required defaultValue={video?.externalUrl} placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              {state.message ? <UiText>{state.message}</UiText> : null}
            </p>
            <button type="submit" className="button-primary shrink-0" disabled={pending}>
              <UiText>{pending ? "저장 중" : video ? "링크 저장" : "링크 등록"}</UiText>
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
