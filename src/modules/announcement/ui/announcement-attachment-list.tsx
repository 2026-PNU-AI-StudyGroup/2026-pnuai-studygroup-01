import type { AnnouncementAttachmentRecord } from "@/modules/announcement/application/announcement-ports";
import { formatAttachmentSize } from "@/modules/announcement/ui/announcement-attachment-presentation";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiSection } from "@/modules/translation/ui/localized-elements";

export function AnnouncementAttachmentList({ attachments, compact = false }: {
  attachments: AnnouncementAttachmentRecord[];
  compact?: boolean;
}) {
  if (attachments.length === 0) return null;
  return (
    <UiSection className={compact ? "border-t border-[var(--line)] px-6 py-5 sm:px-8" : "border-t border-[var(--line)] px-5 py-6 sm:px-8"} aria-label="첨부파일">
      <h2 className="text-sm font-bold text-[var(--ink)]"><UiText>{"첨부파일"}</UiText></h2>
      {/* auto 트랙이면 긴 파일명만큼 늘어나 용량 표시가 패널 밖으로 잘린다. */}
      <ul className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        {attachments.map((attachment) => (
          <li key={attachment.fileId}>
            <a className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-subtle)]" href={`/api/files/${attachment.fileId}`}>
              <span className="min-w-0 truncate font-semibold text-[var(--ink)]">{attachment.originalName}</span>
              <span className="shrink-0 text-xs font-medium text-[var(--muted)]">{formatAttachmentSize(attachment.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </UiSection>
  );
}
