import { UiText } from "@/modules/translation/ui/i18n-provider";

// 대상이 지정된 공지에 소속(팀·프로그램)을 표시. 전체 공지는 아무것도 안 보임.
export function AnnouncementScopeBadge({ teamName, programName }: { teamName: string | null; programName: string | null }) {
  const scope = teamName
    ? { label: "팀", name: teamName }
    : programName
      ? { label: "프로그램", name: programName }
      : null;
  if (!scope) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--muted)] ring-1 ring-inset ring-[var(--line-strong)]">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 shrink-0 fill-none stroke-current stroke-[1.6]"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2.5" /></svg>
      <span className="truncate"><UiText>{scope.label}</UiText> · {scope.name}</span>
    </span>
  );
}
