import type { ReactNode } from "react";

import { ProjectPortalHero, ProgramScheduleCard, type PortalProgram } from "@/app/topics/_components/project-portal-chrome";
import { UiText } from "@/modules/translation/ui/i18n-provider";

/*
  사업 화면 한 장. 머리 카드, 숫자 판, 그 아래 프로젝트 목록(넓은 칸)과 공지, 일정(좁은 칸).
  화면이 묻는 것은 "이 사업의 프로젝트가 지금 어디까지 왔나"라 목록이 가장 큰 덩어리다.
  본문 폭이 68rem(1088px) 이상이면 목록 옆에 20rem 칸을 두고, 그보다 좁으면 목록 아래로 쌓는다.
  화면 폭이 아니라 본문 폭으로 재서 왼쪽 메뉴를 접고 펴도 맞는다.
*/
export function ProjectExplorerView({
  view,
  program,
  titleAction,
  actions,
  finding,
  privatePreview = false,
  banner,
  summary,
  announcementRail,
  now = new Date(),
  children,
  overlays,
}: {
  view: "active" | "past";
  program?: PortalProgram;
  titleAction?: ReactNode;
  actions?: ReactNode;
  finding?: ReactNode;
  privatePreview?: boolean;
  /** 화면 맨 위에 세우는 머리띠. 자문위원처럼 이 화면 하나로만 들어오는 사람에게 쓴다. */
  banner?: ReactNode;
  /** 머리 아래 숫자 판. 관리자에게는 목록 조건을 겸한다. */
  summary?: ReactNode;
  announcementRail: ReactNode;
  now?: Date;
  children: ReactNode;
  overlays?: ReactNode;
}) {
  return (
    <>
      {banner}
      <div className="@container grid gap-3.5">
        <ProjectPortalHero view={view} program={program} titleAction={titleAction} actions={actions} finding={finding} />
        {privatePreview ? (
          <aside role="status" className="flex items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5 text-[0.8125rem] text-[var(--muted)]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-current stroke-[1.5]"><rect x="4.5" y="8.5" width="11" height="8" rx="2" /><path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" strokeLinecap="round" /></svg>
            <UiText>{"관리자에게만 보이는 비공개 사업 미리보기입니다."}</UiText>
          </aside>
        ) : null}
        {summary}
        <div className="grid items-start gap-3.5 @min-[68rem]:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">{children}</div>
          <div className="grid min-w-0 gap-3.5">
            {announcementRail}
            {program ? <ProgramScheduleCard program={program} now={now} /> : null}
          </div>
        </div>
      </div>
      {overlays}
    </>
  );
}
