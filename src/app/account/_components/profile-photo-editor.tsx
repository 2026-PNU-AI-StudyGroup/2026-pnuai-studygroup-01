"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ProfilePhotoUploadError,
  uploadProfilePhoto,
  validateProfilePhotoFile,
} from "@/app/account/_lib/profile-photo-upload";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { FileInput } from "@/shared/ui/form-system";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";
import { IconButton } from "@/shared/ui/icon-button";
import { PersonAvatar } from "@/shared/ui/person-avatar";
import { TrashIcon } from "@/shared/ui/workspace-icons";

type UploadState = "idle" | "uploading" | "complete" | "failed" | "cancelled";

export function ProfilePhotoEditor({
  userId,
  initialUpdatedAt,
}: {
  userId: string;
  initialUpdatedAt: Date | string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const previewAlt = t("선택한 프로필 사진 미리보기");
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | string | null>(initialUpdatedAt);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  async function selectPhoto(file: File | undefined) {
    if (!file) return;
    try {
      validateProfilePhotoFile(file);
    } catch (error) {
      setState("failed");
      setMessage(t(error instanceof Error ? error.message : "사진을 확인해 주세요."));
      return;
    }
    controllerRef.current?.abort();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setPreviewUrl(preview);
    setProgress(0);
    setState("uploading");
    setMessage(t("사진을 업로드하고 있습니다."));
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      await uploadProfilePhoto(file, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (controller.signal.aborted) return;
      const version = new Date().toISOString();
      setUpdatedAt(version);
      setPreviewUrl(null);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setState("complete");
      setProgress(100);
      setMessage(t("프로필 사진을 변경했습니다."));
      router.refresh();
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
        setPreviewUrl(null);
        setState("cancelled");
        setMessage(t("사진 업로드를 취소했습니다."));
      } else {
        setState("failed");
        setMessage(t(error instanceof ProfilePhotoUploadError ? error.message : "사진 업로드에 실패했습니다."));
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  async function removePhoto() {
    if (!updatedAt || state === "uploading") return;
    setMessage(null);
    const response = await fetch("/api/profile-images", { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      setState("failed");
      setMessage(t(body?.message ?? "프로필 사진을 삭제하지 못했습니다."));
      return;
    }
    setUpdatedAt(null);
    setPreviewUrl(null);
    setState("idle");
    setMessage(t("프로필 사진을 삭제했습니다."));
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {previewUrl ? (
        <img src={previewUrl} alt={previewAlt} className="size-16 shrink-0 rounded-full object-cover" />
      ) : (
        <PersonAvatar userId={userId} updatedAt={updatedAt} className="size-16" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold"><UiText>{"프로필 사진"}</UiText></p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]"><UiText>{"JPEG, PNG, WebP · 최대 5MiB · 가운데가 보이도록 표시됩니다."}</UiText></p>
        {state === "uploading" ? (
          <div className="mt-2" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><div className="h-full bg-[var(--primary)] transition-[width]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]"><UiText>{`업로드 ${progress}%`}</UiText></p>
          </div>
        ) : null}
        {message ? <p aria-live="polite" className={`mt-2 text-xs font-semibold ${state === "failed" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{message}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={`button-secondary cursor-pointer ${state === "uploading" ? "pointer-events-none opacity-50" : ""}`}>
            <span><UiText>{updatedAt ? "사진 교체" : "사진 설정"}</UiText></span>
            <FileInput
              ref={inputRef}
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={state === "uploading"}
              onChange={(event) => void selectPhoto(event.currentTarget.files?.[0])}
            />
          </label>
          {state === "uploading" ? <button type="button" className="button-quiet" onClick={() => controllerRef.current?.abort()}><UiText>{"업로드 취소"}</UiText></button> : null}
          {updatedAt ? <IconButton type="button" className="text-[var(--danger)] hover:text-[var(--danger)]" onClick={() => setDeleteConfirmationOpen(true)} aria-label="프로필 사진 삭제" title="프로필 사진 삭제"><TrashIcon className="size-5" /></IconButton> : null}
        </div>
      </div>
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        title="프로필 사진 삭제"
        description="프로필 사진을 삭제할까요? 삭제한 사진은 복구할 수 없습니다."
        confirmLabel="삭제"
        onConfirm={() => {
          setDeleteConfirmationOpen(false);
          void removePhoto();
        }}
        onCancel={() => setDeleteConfirmationOpen(false)}
      />
    </div>
  );
}
