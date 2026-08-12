import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { AnnouncementVisibility } from "@/modules/announcement/application/announcement-ports";

// 공지 대상과 실제 열람 범위를 함께 표시한다.
export function AnnouncementScopeBadge({ teamName, programName, visibility }: {
  teamName: string | null;
  programName: string | null;
  visibility: AnnouncementVisibility;
}) {
  const scope = teamName
    ? { label: "팀", name: teamName }
    : programName
      ? { label: "프로그램", name: programName }
      : null;
  const visibilityLabel = visibility === "AUTHENTICATED"
    ? "전체 공개"
    : teamName
      ? "팀 구성원"
      : "프로그램 구성원";
  return (
    <>
      {scope ? (
        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--muted)] ring-1 ring-inset ring-[var(--line-strong)]">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 shrink-0 fill-none stroke-current stroke-[1.6]"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2.5" /></svg>
          <span className="truncate"><UiText>{scope.label}</UiText> · {scope.name}</span>
        </span>
      ) : null}
      <span className="inline-flex items-center rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--primary)]">
        <UiText>{visibilityLabel}</UiText>
      </span>
    </>
  );
}
