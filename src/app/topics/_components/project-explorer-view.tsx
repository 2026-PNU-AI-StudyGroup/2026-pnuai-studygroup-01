import type { ComponentProps, ReactNode } from "react";

import { ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function ProjectExplorerView({
  view,
  program,
  search,
  titleAction,
  privatePreview = false,
  announcementRail,
  children,
  overlays,
}: {
  view: ComponentProps<typeof ProjectPortalHero>["view"];
  program?: ComponentProps<typeof ProjectPortalHero>["program"];
  search?: ReactNode;
  titleAction?: ReactNode;
  privatePreview?: boolean;
  announcementRail: ReactNode;
  children: ReactNode;
  overlays?: ReactNode;
}) {
  return (
    <>
      <ProjectPortalHero view={view} program={program} search={search} titleAction={titleAction} />
      {privatePreview ? (
        <aside role="status" className="mt-5 flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold text-[var(--muted)]">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-current stroke-[1.8]"><rect x="4.5" y="8.5" width="11" height="8" rx="2" /><path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" strokeLinecap="round" /></svg>
          <UiText>{"관리자에게만 보이는 비공개 프로그램 미리보기입니다."}</UiText>
        </aside>
      ) : null}
      {announcementRail}
      {children}
      {overlays}
    </>
  );
}
