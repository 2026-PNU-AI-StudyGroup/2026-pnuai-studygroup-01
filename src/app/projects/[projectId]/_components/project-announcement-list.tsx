import Link from "next/link";

import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { PinIcon } from "@/shared/ui/workspace-icons";

export function ProjectAnnouncementList({
  announcements,
  preview = false,
}: {
  announcements: AnnouncementRecord[];
  preview?: boolean;
}) {
  const items = preview ? announcements.slice(0, 3) : announcements;

  if (items.length === 0) {
    return <EmptyState title="등록된 공지가 없습니다" description="프로젝트 공지가 등록되면 여기에서 확인할 수 있습니다." />;
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
      <ol className="divide-y divide-[var(--line)]">
        {items.map((announcement) => (
          <li key={announcement.id}>
            <Link
              href={`/announcements/${announcement.id}`}
              className="record-row group grid gap-3 px-5 py-5 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--primary-subtle)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {announcement.pinned ? (
                    <span className="inline-flex items-center text-[var(--primary)]">
                      <PinIcon className="size-3.5" />
                      <span className="sr-only"><UiText>{"고정"}</UiText></span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--primary)]">
                    <UiText>{announcement.teamId ? "프로젝트 공지" : "전체 공지"}</UiText>
                  </span>
                </div>
                <h3 className="mt-2 truncate text-base font-bold tracking-[-0.02em] text-[var(--ink)] transition-colors group-hover:text-[var(--primary-hover)]">
                  <UiText>{announcement.title}</UiText>
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                  <UiText>{announcement.content.replace(/\s+/g, " ")}</UiText>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--muted)] sm:flex-col sm:items-end">
                <span className="text-[var(--ink)]">{announcement.authorName}</span>
                <time dateTime={announcement.createdAt.toISOString()}>
                  <UiDate value={announcement.createdAt} mode="date" />
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
