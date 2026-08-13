"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  createAnnouncementAction,
  createSystemAnnouncementAction,
  type AnnouncementActionState,
  updateAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";
import { AnnouncementTargetPicker } from "@/app/announcements/_components/announcement-target-picker";
import type { AnnouncementTargets } from "@/app/announcements/_lib/announcement-audience";
import type { AnnouncementAttachmentRecord, AnnouncementVisibility } from "@/modules/announcement/application/announcement-ports";
import { AnnouncementAttachmentEditor } from "@/modules/announcement/ui/announcement-attachment-editor";
import { appendAnnouncementUploads, type AnnouncementUploadProgress } from "@/modules/announcement/ui/upload-announcement-attachments";
import { fileUploadProgressLabel, isUploadAbortError, uploadFailureMessage } from "@/modules/file/ui/upload-file";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, Toggle } from "@/shared/ui/form-system";

const initialState: AnnouncementActionState = {
  status: "idle",
  message: "",
};

export function AnnouncementForm({
  announcementId,
  targets,
  initialTitle = "",
  initialContent = "",
  initialPinned = false,
  initialTarget = "",
  initialVisibility = "AUTHENTICATED",
  initialAttachments = [],
  returnHref,
  creationScope = "SCOPED",
  targetLocked = false,
  targetLabel,
}: {
  announcementId?: string;
  targets: AnnouncementTargets;
  initialTitle?: string;
  initialContent?: string;
  initialPinned?: boolean;
  initialTarget?: string;
  initialVisibility?: AnnouncementVisibility;
  initialAttachments?: AnnouncementAttachmentRecord[];
  returnHref?: string;
  creationScope?: "SYSTEM" | "SCOPED";
  targetLocked?: boolean;
  targetLabel?: string;
}) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState(initialTarget);
  const [visibility, setVisibility] = useState<AnnouncementVisibility>(initialVisibility);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [retainedAttachmentIds, setRetainedAttachmentIds] = useState(initialAttachments.map((attachment) => attachment.fileId));
  const [uploadProgress, setUploadProgress] = useState<AnnouncementUploadProgress | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const completedUploadsRef = useRef(new Map<File, string>());
  const editing = Boolean(announcementId);
  const isProgramTarget = target.startsWith("program:");

  useEffect(() => () => uploadControllerRef.current?.abort(), []);

  const changeTarget = (nextTarget: string) => {
    setTarget(nextTarget);
    if (nextTarget.startsWith("team:")) setVisibility("TARGET_MEMBERS");
    else if (nextTarget.startsWith("program:") && nextTarget !== target) setVisibility("AUTHENTICATED");
    else if (!nextTarget.startsWith("program:")) setVisibility("AUTHENTICATED");
  };

  return (
    <form
      className="panel overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setState(initialState);
        startTransition(async () => {
          try {
            const uploadController = new AbortController();
            uploadControllerRef.current = uploadController;
            await appendAnnouncementUploads(formData, selectedFiles, completedUploadsRef.current, {
              signal: uploadController.signal,
              onProgress: setUploadProgress,
            });
            uploadControllerRef.current = null;
            setUploadProgress(null);
            const result = announcementId
              ? await updateAnnouncementAction(announcementId, initialState, formData)
              : creationScope === "SYSTEM"
                ? await createSystemAnnouncementAction(initialState, formData)
                : await createAnnouncementAction(initialState, formData);
            setState(result);
          } catch (error) {
            if (!isUploadAbortError(error)) {
              setState({ status: "error", message: error instanceof Error ? error.message : uploadFailureMessage });
            }
          } finally {
            uploadControllerRef.current = null;
            setUploadProgress(null);
          }
        });
      }}
    >
      {returnHref ? <input type="hidden" name="returnTo" value={returnHref} /> : null}
      <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"대상"}</UiText></span>
          {targetLocked ? (
            <>
              <input type="hidden" name="target" value={target || "GLOBAL"} />
              <div className="rounded-[var(--radius-control)] border border-[var(--field-border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
                <UiText>{targetLabel ?? (isProgramTarget ? "선택한 프로그램" : target.startsWith("team:") ? "선택한 프로젝트" : "시스템 전체")}</UiText>
              </div>
            </>
          ) : (
            <AnnouncementTargetPicker programs={targets.programs} teams={targets.teams} value={target} onValueChange={changeTarget} />
          )}
          <span className="text-xs font-medium text-[var(--muted)]">
            <UiText>{isProgramTarget
              ? "프로그램 공지는 로그인 사용자 전체 또는 프로그램 구성원에게 공개할 수 있습니다."
              : target.startsWith("team:")
                ? "팀 공지는 해당 팀 구성원에게만 공개됩니다."
                : "전체 공지는 모든 로그인 사용자에게 공개됩니다."}</UiText>
          </span>
        </div>
        {isProgramTarget ? (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--ink)]"><UiText>{"열람 범위"}</UiText></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <VisibilityOption
                value="AUTHENTICATED"
                checked={visibility === "AUTHENTICATED"}
                onChange={setVisibility}
                label="로그인 사용자 전체"
                description="프로그램 소속과 관계없이 볼 수 있습니다."
              />
              <VisibilityOption
                value="TARGET_MEMBERS"
                checked={visibility === "TARGET_MEMBERS"}
                onChange={setVisibility}
                label="프로그램 구성원만"
                description="소속 학생·지도교수·담당 교수만 볼 수 있습니다."
              />
            </div>
          </fieldset>
        ) : <input type="hidden" name="visibility" value={visibility} />}
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"제목"}</UiText></span>
          <UiInput
            className="form-control bg-[var(--surface)]"
            name="title"
            type="text"
            maxLength={120}
            defaultValue={initialTitle}
            placeholder="공지 제목을 입력하세요"
            required
            autoFocus
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"본문"}</UiText></span>
          <UiTextarea
            className="form-control min-h-80 bg-[var(--surface)] leading-7"
            name="content"
            maxLength={20_000}
            defaultValue={initialContent}
            placeholder="구성원이 알아야 할 내용을 입력하세요"
            required
          />
        </label>
        <AnnouncementAttachmentEditor
          existingAttachments={initialAttachments}
          retainedAttachmentIds={retainedAttachmentIds}
          selectedFiles={selectedFiles}
          disabled={pending}
          onRetainedAttachmentIdsChange={setRetainedAttachmentIds}
          onSelectedFilesChange={setSelectedFiles}
        />
        <Toggle name="pinned" defaultChecked={initialPinned} label="목록 상단에 고정" />
        {uploadProgress ? (
          <p role="status" aria-live="polite" className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold">
            <UiText>{`${uploadProgress.fileIndex + 1}/${uploadProgress.fileCount} ${uploadProgress.fileName} · ${fileUploadProgressLabel(uploadProgress.progress)}`}</UiText>
          </p>
        ) : null}
        {state.message ? (
          <p
            className="rounded-[var(--radius-control)] bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--danger)]"
            role="alert"
          >
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-8">
        {uploadProgress ? <button type="button" className="button-secondary" onClick={() => uploadControllerRef.current?.abort()}><UiText>{"업로드 취소"}</UiText></button> : null}
        <button
          className="button-primary max-sm:w-full"
          type="submit"
          disabled={pending}
        >
          <UiText>{pending
            ? editing ? "수정 중" : "등록 중"
            : editing ? "수정 완료" : "공지 등록"}</UiText>
        </button>
      </div>
    </form>
  );
}

function VisibilityOption({ value, checked, onChange, label, description }: {
  value: AnnouncementVisibility;
  checked: boolean;
  onChange: (value: AnnouncementVisibility) => void;
  label: string;
  description: string;
}) {
  return <ChoiceCard
    type="radio"
    name="visibility"
    value={value}
    checked={checked}
    onChange={() => onChange(value)}
    label={label}
    description={description}
    className={checked ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--field-border)] bg-[var(--surface)] hover:border-[var(--line-strong)]"}
  />;
}
