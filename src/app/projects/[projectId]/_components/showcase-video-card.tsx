"use client";

import { useActionState, useId } from "react";

import { upsertShowcaseVideoAction, type ReportActionState } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TextInput } from "@/shared/ui/form-system";
import { ArtifactMedia } from "@/shared/ui/artifact-media";
import { VideoIcon } from "@/shared/ui/workspace-icons";
import { FormSection, rowActionClass } from "@/app/projects/[projectId]/_components/workspace-page-header";

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
    <FormSection
      id={titleId}
      title={<UiText>{"시연·발표 영상"}</UiText>}
      description={<UiText>{"YouTube 링크를 넣으면 프로젝트 상세 화면에서 바로 재생됩니다."}</UiText>}
      bodyClassName="grid gap-4 px-5 py-4"
    >
      {/* 미리보기는 확인용이다. 편집 화면을 다 밀어낼 만큼 클 필요가 없다. */}
      <div className="max-w-md">
        {video?.externalUrl ? (
          <ArtifactMedia type="PRESENTATION_VIDEO" title={video.title} externalUrl={video.externalUrl} />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-[var(--line-strong)] text-[var(--muted)]">
            <VideoIcon className="size-6" />
            <p className="text-[0.8125rem]"><UiText>{"등록된 영상이 없습니다"}</UiText></p>
          </div>
        )}
      </div>

      {canManage ? (
        <form action={action} data-showcase-form="" className="grid gap-3">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="type" value="PRESENTATION_VIDEO" />
          <label className="grid gap-2 text-sm font-medium">
            <UiText>{"YouTube 링크"}</UiText>
            <TextInput name="externalUrl" type="url" required defaultValue={video?.externalUrl} placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p aria-live="polite" className={`mr-auto text-[0.8125rem] font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              {state.message ? <UiText>{state.message}</UiText> : null}
            </p>
            <button type="submit" className={`${rowActionClass} shrink-0`} disabled={pending}>
              <UiText>{pending ? "저장 중" : video ? "링크 저장" : "링크 등록"}</UiText>
            </button>
          </div>
        </form>
      ) : null}
    </FormSection>
  );
}
