import Link from "next/link";

import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";
import { Pill } from "@/modules/project-program/ui/work-screen";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { PinIcon } from "@/shared/ui/workspace-icons";

/** 카드 안의 공지 줄. 테두리는 감싸는 카드가 그리고, 여기는 1px 선으로 줄만 나눈다. */
export function ProjectAnnouncementList({
  announcements,
  preview = false,
}: {
  announcements: AnnouncementRecord[];
  preview?: boolean;
}) {
  const items = preview ? announcements.slice(0, 3) : announcements;

  if (items.length === 0) {
    return <div className="border-t border-[var(--line)] px-5"><EmptyState variant="section" title="등록된 공지가 없습니다" description="프로젝트 공지가 등록되면 여기에서 확인할 수 있습니다." /></div>;
  }

  return (
    <ol>
      {items.map((announcement) => (
        <li key={announcement.id} className="border-t border-[var(--line)]">
          <Link
            href={`/announcements/${announcement.id}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-3 transition-colors hover:bg-[#fafbfc] focus-visible:bg-[var(--accent-subtle)]"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                {announcement.pinned ? (
                  <span className="inline-flex shrink-0 items-center text-[var(--primary)]">
                    <PinIcon className="size-3.5" />
                    <span className="sr-only"><UiText>{"고정"}</UiText></span>
                  </span>
                ) : null}
                <h3 className="min-w-0 truncate text-sm font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--primary)]">
                  <UiText>{announcement.title}</UiText>
                </h3>
                <Pill>{announcement.teamId ? "프로젝트 공지" : "전체 공지"}</Pill>
              </div>
              <p className="mt-0.5 truncate text-[0.8125rem] leading-[1.125rem] text-[var(--muted)]">
                <UiText>{announcement.content.replace(/\s+/g, " ")}</UiText>
              </p>
            </div>
            <div className="text-right text-xs leading-4">
              <p className="text-[var(--ink)]">{announcement.authorName}</p>
              <time className="mt-1 block tabular-nums text-[var(--muted)]" dateTime={announcement.createdAt.toISOString()}>
                <UiDate value={announcement.createdAt} mode="date" />
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
