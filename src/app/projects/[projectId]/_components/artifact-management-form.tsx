"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import {
  removeArtifactAction,
  type ReportActionState,
  updateArtifactAction,
} from "@/app/projects/[projectId]/_actions/team-report-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { TextInput } from "@/shared/ui/form-system";
import { SettingsIcon } from "@/shared/ui/workspace-icons";

const initialState: ReportActionState = { status: "idle", message: "" };

const artifactTypes = [
  ["PRESENTATION_VIDEO", "발표 영상"],
  ["SOURCE_CODE", "소스 코드"],
  ["POSTER", "포스터"],
  ["IMAGE", "이미지"],
  ["OTHER", "기타"],
] as const;

const artifactTypeOptions = artifactTypes.map(([value, label]) => ({ value, label }));

export function ArtifactManagementForm({
  teamId,
  artifact,
}: {
  teamId: string;
  artifact: { id: string; type: (typeof artifactTypes)[number][0]; title: string; fileId?: string };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [updateState, updateAction, updatePending] = useActionState(updateArtifactAction, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeArtifactAction, initialState);
  const pending = updatePending || removePending;

  useEffect(() => {
    if (updateState.status === "success" || removeState.status === "success") dialogRef.current?.close();
  }, [removeState.status, updateState.status]);

  const error = updateState.status === "error" ? updateState.message
    : removeState.status === "error" ? removeState.message
      : null;

  return (
    <>
      <button type="button" className="button-quiet mt-3 w-full gap-2" onClick={() => dialogRef.current?.showModal()} disabled={pending}>
        <SettingsIcon className="size-4 shrink-0" /><UiText>{"정보 수정·삭제"}</UiText>
      </button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="w-[min(100%-2rem,34rem)] rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-0 shadow-[0_24px_70px_rgba(31,35,48,.18)]">
        <div className="border-b border-[var(--line)] px-6 py-5">
          <h2 id={titleId} className="text-lg font-bold"><UiText>{"결과물 정보 관리"}</UiText></h2>
          <p className="muted mt-1 text-sm leading-6"><UiText>{artifact.fileId ? "파일은 교체할 수 없습니다. 바꾸려면 삭제 후 새 파일을 등록하세요." : "등록 방식과 링크는 유지한 채 제목과 종류만 수정할 수 있습니다."}</UiText></p>
        </div>
        <form action={updateAction} className="grid gap-5 px-6 py-6">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="artifactId" value={artifact.id} />
          <div className="grid gap-2 text-sm font-semibold"><span><UiText>{"결과물 종류"}</UiText></span><CustomSelect name="type" ariaLabel="결과물 종류" options={artifactTypeOptions} defaultValue={artifact.type} disabled={pending} /></div>
          <label className="grid gap-2 text-sm font-semibold"><UiText>{"결과물 제목"}</UiText><TextInput name="title" defaultValue={artifact.title} required maxLength={200} disabled={pending} /></label>
          {error ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{error}</UiText></p> : null}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" className="button-secondary" onClick={() => dialogRef.current?.close()} disabled={pending}><UiText>{"취소"}</UiText></button><button type="submit" className="button-primary" disabled={pending}><UiText>{updatePending ? "저장 중" : "저장"}</UiText></button></div>
        </form>
        <form action={removeAction} className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-4">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="artifactId" value={artifact.id} />
          <p className="text-sm font-semibold"><UiText>{"삭제한 결과물은 복구할 수 없습니다."}</UiText></p>
          <ConfirmSubmitButton className="button-danger shrink-0" disabled={pending} confirmMessage={artifact.fileId ? "결과물과 연결된 파일을 삭제할까요?" : "결과물 링크를 삭제할까요?"}><UiText>{removePending ? "삭제 중" : "삭제"}</UiText></ConfirmSubmitButton>
        </form>
      </dialog>
    </>
  );
}
