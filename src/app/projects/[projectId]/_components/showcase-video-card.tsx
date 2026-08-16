"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import { upsertShowcaseVideoAction, type ReportActionState } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { ReportFormActions, ReportFormDialogHeader, reportDialogClassName } from "@/app/projects/[projectId]/_components/report-form-layout";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(upsertShowcaseVideoAction, initialState);

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state.status]);

  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-base font-extrabold tracking-[-0.02em]"><UiText>{"시연·발표 영상"}</UiText></h2>
        {canManage ? <button type="button" className="button-secondary" disabled={pending} onClick={() => dialogRef.current?.showModal()}><UiText>{video ? "YouTube 링크 변경" : "YouTube 링크 추가"}</UiText></button> : null}
      </div>
      {video?.externalUrl ? (
        <ArtifactMedia type="PRESENTATION_VIDEO" title={video.title} externalUrl={video.externalUrl} />
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--muted)]">
          <VideoIcon className="size-8" />
          <p className="text-sm font-semibold"><UiText>{"등록된 영상이 없습니다"}</UiText></p>
        </div>
      )}
      <dialog ref={dialogRef} aria-labelledby={`${titleId}-dialog`} onCancel={(event) => { if (pending) event.preventDefault(); }} className={`${reportDialogClassName} max-w-xl`}>
        <ReportFormDialogHeader title="시연·발표 영상" titleId={`${titleId}-dialog`} closeLabel="영상 등록 닫기" pending={pending} onClose={() => dialogRef.current?.close()} />
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="type" value="PRESENTATION_VIDEO" />
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"YouTube 링크"}</UiText><TextInput name="externalUrl" type="url" required defaultValue={video?.externalUrl} placeholder="https://www.youtube.com/watch?v=..." /></label>
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          <ReportFormActions pending={pending} pendingLabel="저장 중" submitLabel="저장" onCancel={() => dialogRef.current?.close()} />
        </form>
      </dialog>
    </section>
  );
}
