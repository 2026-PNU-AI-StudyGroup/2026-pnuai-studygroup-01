"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { Toggle } from "@/shared/ui/form-system";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";
import { ChoiceCard } from "@/shared/ui/form-system";
import { SplitDialog } from "@/shared/ui/split-dialog";
import { AnnouncementAttachmentEditor } from "@/modules/announcement/ui/announcement-attachment-editor";
import { appendAnnouncementUploads, type AnnouncementUploadProgress } from "@/modules/announcement/ui/upload-announcement-attachments";
import { fileUploadProgressLabel, isUploadAbortError, uploadFailureMessage } from "@/modules/file/ui/upload-file";

const initialState: ProgramAnnouncementActionState = { status: "idle", message: "" };
export type ProgramAnnouncementActionState = { status: "idle" | "error" | "success"; message: string };

export function ProgramAnnouncementCreateModal({ programId, programName, closeHref, createAction }: {
  programId: string;
  programName: string;
  closeHref: string;
  createAction: (previous: ProgramAnnouncementActionState, formData: FormData) => Promise<ProgramAnnouncementActionState>;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialFormSnapshotRef = useRef("");
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<AnnouncementUploadProgress | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const completedUploadsRef = useRef(new Map<File, string>());

  useEffect(() => {
    if (state.status !== "success") return;
    router.replace(closeHref);
    router.refresh();
  }, [closeHref, router, state.status]);

  useEffect(() => {
    if (formRef.current) initialFormSnapshotRef.current = JSON.stringify(Array.from(new FormData(formRef.current).entries()));
  }, []);

  useEffect(() => () => uploadControllerRef.current?.abort(), []);

  const requestClose = useCallback(() => {
    if (pending) return;
    if (selectedFiles.length > 0 || (formRef.current && initialFormSnapshotRef.current !== JSON.stringify(Array.from(new FormData(formRef.current).entries())))) {
      setDiscardConfirmationOpen(true);
      return;
    }
    router.replace(closeHref);
  }, [closeHref, pending, router, selectedFiles.length]);

  return (
    <SplitDialog
      dialogRef={dialogRef}
      closeButtonRef={closeButtonRef}
      openOnMount
      eyebrow="프로그램 공지"
      title="새 공지 작성"
      context={programName}
      closeLabel="공지 작성 닫기"
      onRequestClose={requestClose}
    >
      <form
        ref={formRef}
        className="grid grid-cols-[minmax(0,1fr)] gap-6 px-6 py-7 sm:px-8 lg:px-10 lg:py-9"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
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
              setState(await createAction(initialState, formData));
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
        <input type="hidden" name="programId" value={programId} />
        <p className="rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--muted)]">
          <strong className="text-[var(--ink)]"><UiText>{programName}</UiText></strong><UiText>{"에 게시됩니다. 공지 대상은 변경할 수 없습니다."}</UiText>
        </p>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold"><UiText>{"열람 범위"}</UiText></legend>
          <div className="grid gap-2 sm:grid-cols-2"><ChoiceCard name="visibility" value="AUTHENTICATED" defaultChecked label="로그인 사용자 전체" description="프로그램 소속과 관계없이 볼 수 있습니다." /><ChoiceCard name="visibility" value="TARGET_MEMBERS" label="프로그램 구성원만" description="소속 학생·지도교수·담당 교수만 볼 수 있습니다." /></div>
        </fieldset>
        <label className="grid gap-2 text-sm font-semibold"><span><UiText>{"제목"}</UiText></span><UiInput name="title" maxLength={120} required autoFocus className="form-control bg-[var(--surface)]" /></label>
        <label className="grid gap-2 text-sm font-semibold"><span><UiText>{"본문"}</UiText></span><UiTextarea name="content" maxLength={20_000} required className="form-control min-h-72 bg-[var(--surface)] leading-7" /></label>
        <AnnouncementAttachmentEditor
          retainedAttachmentIds={[]}
          selectedFiles={selectedFiles}
          disabled={pending}
          onRetainedAttachmentIdsChange={() => undefined}
          onSelectedFilesChange={setSelectedFiles}
        />
        <Toggle name="pinned" label="상단 고정" />
        {uploadProgress ? <p role="status" aria-live="polite" className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold"><UiText>{`${uploadProgress.fileIndex + 1}/${uploadProgress.fileCount} ${uploadProgress.fileName} · ${fileUploadProgressLabel(uploadProgress.progress)}`}</UiText></p> : null}
        {state.status === "error" ? <p role="alert" className="text-sm font-bold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
        <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-5">
          {uploadProgress ? <button type="button" className="button-secondary" onClick={() => uploadControllerRef.current?.abort()}><UiText>{"업로드 취소"}</UiText></button> : null}
          <button type="button" className="button-secondary" onClick={requestClose} disabled={pending}><UiText>{"취소"}</UiText></button>
          <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "등록 중" : "공지 등록"}</UiText></button>
        </div>
      </form>
      <ConfirmationDialog open={discardConfirmationOpen} title="작성 중인 내용 삭제" description="닫으면 입력한 공지 내용이 사라집니다. 계속하시겠습니까?" confirmLabel="계속" onConfirm={() => router.replace(closeHref)} onCancel={() => setDiscardConfirmationOpen(false)} returnFocusRef={closeButtonRef} />
    </SplitDialog>
  );
}
