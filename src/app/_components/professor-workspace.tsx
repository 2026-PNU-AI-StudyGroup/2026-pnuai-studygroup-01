import type { ReactNode } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";

/**
 * 교수 업무 화면의 본문 칸. 제목 줄(제목, 그 아래 데이터에서 뽑은 한 줄, 오른쪽 할 일 버튼)과
 * 카드 묶음을 한 간격으로 쌓는다. 업무 목록(ProfessorSidebar)은 AppShell 의 panel 로 넘겨 왼쪽 메뉴에 둔다.
 */
export function ProfessorWorkspace({ eyebrow, title, description, actions, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)]">
      <div className="@container grid min-w-0 gap-3.5 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12 2xl:px-14">
        <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {/* 제목 칸이 18rem 아래로 줄면 버튼이 다음 줄로 내려간다. 휴대폰에서 제목이 한 글자씩 꺾이지 않게. */}
          <div className="min-w-[min(100%,18rem)] flex-1">
            {eyebrow ? <p className="mb-1 text-[0.8125rem] text-[var(--muted)]"><UiText>{eyebrow}</UiText></p> : null}
            <h1 className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)] [overflow-wrap:anywhere]"><UiText>{title}</UiText></h1>
            {description ? <p className="mt-1.5 text-sm text-[var(--ink)]"><UiText>{description}</UiText></p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        <UiText>{children}</UiText>
      </div>
    </main>
  );
}
