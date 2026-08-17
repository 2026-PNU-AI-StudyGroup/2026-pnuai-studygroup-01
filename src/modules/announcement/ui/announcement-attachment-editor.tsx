"use client";

import { useId, useState } from "react";

import type { AnnouncementAttachmentRecord } from "@/modules/announcement/application/announcement-ports";
import { formatAttachmentSize } from "@/modules/announcement/ui/announcement-attachment-presentation";
import {
  ANNOUNCEMENT_ATTACHMENT_MAX_BYTES,
  ANNOUNCEMENT_ATTACHMENT_MAX_COUNT,
} from "@/modules/file/domain/upload-policy";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FileInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { TrashIcon, UndoIcon } from "@/shared/ui/workspace-icons";

export function fileSelectionKey(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

export function AnnouncementAttachmentEditor({
  existingAttachments = [],
  retainedAttachmentIds,
  selectedFiles,
  disabled = false,
  onRetainedAttachmentIdsChange,
  onSelectedFilesChange,
}: {
  existingAttachments?: AnnouncementAttachmentRecord[];
  retainedAttachmentIds: string[];
  selectedFiles: File[];
  disabled?: boolean;
  onRetainedAttachmentIdsChange: (ids: string[]) => void;
  onSelectedFilesChange: (files: File[]) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState("");
  const retainedAttachments = existingAttachments.filter((attachment) => retainedAttachmentIds.includes(attachment.fileId));
  const totalBytes = retainedAttachments.reduce((sum, attachment) => sum + attachment.size, 0) +
    selectedFiles.reduce((sum, file) => sum + file.size, 0);

  const addFiles = (incoming: File[]) => {
    const existingKeys = new Set(selectedFiles.map(fileSelectionKey));
    const uniqueIncoming = incoming.filter((file) => !existingKeys.has(fileSelectionKey(file)));
    const nextFiles = [...selectedFiles, ...uniqueIncoming];
    const nextCount = retainedAttachments.length + nextFiles.length;
    const nextBytes = retainedAttachments.reduce((sum, attachment) => sum + attachment.size, 0) +
      nextFiles.reduce((sum, file) => sum + file.size, 0);
    if (incoming.some((file) => file.size < 1)) {
      setError("빈 파일은 첨부할 수 없습니다.");
      return;
    }
    if (nextCount > ANNOUNCEMENT_ATTACHMENT_MAX_COUNT || nextBytes > ANNOUNCEMENT_ATTACHMENT_MAX_BYTES) {
      setError("첨부파일은 최대 5개, 합계 500MiB 이하로 선택해 주세요.");
      return;
    }
    setError("");
    onSelectedFilesChange(nextFiles);
  };

  const toggleExisting = (attachment: AnnouncementAttachmentRecord, retained: boolean) => {
    if (retained) {
      setError("");
      onRetainedAttachmentIdsChange(retainedAttachmentIds.filter((id) => id !== attachment.fileId));
      return;
    }
    const nextRetained = [...retainedAttachmentIds, attachment.fileId];
    const nextAttachments = existingAttachments.filter((candidate) => nextRetained.includes(candidate.fileId));
    const nextCount = nextAttachments.length + selectedFiles.length;
    const nextBytes = nextAttachments.reduce((sum, candidate) => sum + candidate.size, 0) +
      selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (nextCount > ANNOUNCEMENT_ATTACHMENT_MAX_COUNT || nextBytes > ANNOUNCEMENT_ATTACHMENT_MAX_BYTES) {
      setError("첨부파일은 최대 5개, 합계 500MiB 이하로 선택해 주세요.");
      return;
    }
    setError("");
    onRetainedAttachmentIdsChange(nextRetained);
  };

  return (
    // auto 트랙이면 긴 파일명의 min-content 폭만큼 늘어나 삭제 버튼이 화면 밖으로 밀린다.
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby={`${inputId}-label`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${inputId}-label`} className="text-sm font-semibold text-[var(--ink)]"><UiText>{"첨부파일"}</UiText></h2>
          <p className="mt-1 text-xs font-medium text-[var(--muted)]"><UiText>{"파일 형식 제한 없음 · 최대 5개 · 합계 500MiB"}</UiText></p>
        </div>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {retainedAttachments.length + selectedFiles.length} / {ANNOUNCEMENT_ATTACHMENT_MAX_COUNT} · {formatAttachmentSize(totalBytes)}
        </span>
      </div>

      {existingAttachments.length > 0 || selectedFiles.length > 0 ? (
        <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          {existingAttachments.map((attachment) => {
            const retained = retainedAttachmentIds.includes(attachment.fileId);
            return (
              <li key={attachment.fileId} className={`flex items-center justify-between gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-sm ${retained ? "border-[var(--line)] bg-[var(--surface)]" : "border-[var(--danger)] bg-[var(--danger-subtle)] opacity-75"}`}>
                <span className="min-w-0">
                  <a className="block truncate font-semibold text-[var(--ink)] hover:underline" href={`/api/files/${attachment.fileId}`}>{attachment.originalName}</a>
                  <span className="text-xs text-[var(--muted)]">{formatAttachmentSize(attachment.size)}</span>
                </span>
                <IconButton
                  type="button"
                  className={`shrink-0 ${retained ? "text-[var(--danger)] hover:text-[var(--danger)]" : ""}`}
                  disabled={disabled}
                  aria-label={retained ? `${attachment.originalName} 삭제` : `${attachment.originalName} 삭제 취소`}
                  title={retained ? "첨부파일 삭제" : "첨부파일 삭제 취소"}
                  onClick={() => toggleExisting(attachment, retained)}
                >
                  {retained ? <TrashIcon className="size-5" /> : <UndoIcon className="size-5" />}
                </IconButton>
                {retained ? <input type="hidden" name="retainedAttachmentIds" value={attachment.fileId} /> : null}
              </li>
            );
          })}
          {selectedFiles.map((file) => (
            <li key={fileSelectionKey(file)} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[var(--ink)]">{file.name}</span>
                <span className="text-xs text-[var(--muted)]">{formatAttachmentSize(file.size)}</span>
              </span>
              <IconButton type="button" className="shrink-0 text-[var(--danger)] hover:text-[var(--danger)]" disabled={disabled} aria-label={`${file.name} 삭제`} title="첨부파일 삭제" onClick={() => onSelectedFilesChange(selectedFiles.filter((candidate) => candidate !== file))}>
                <TrashIcon className="size-5" />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}

      <FileInput
        id={inputId}
        aria-label="공지 첨부파일"
        multiple
        disabled={disabled || retainedAttachments.length + selectedFiles.length >= ANNOUNCEMENT_ATTACHMENT_MAX_COUNT}
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      {error ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{error}</UiText></p> : null}
    </section>
  );
}
