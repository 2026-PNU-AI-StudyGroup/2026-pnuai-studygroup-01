import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

import { ScreenTitle } from "@/app/_components/screen-title";
import { cardClass } from "@/modules/project-program/ui/work-screen";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export function AccountSectionLayout({ finding, children }: { finding?: ReactNode; children: ReactNode }) {
  return (
    <ExplorerLayout>
      <div className="grid gap-8">
        <ScreenTitle id="account-title" title={<UiText>{"내 계정"}</UiText>} finding={finding} />
        {children}
      </div>
    </ExplorerLayout>
  );
}

/**
 * 설정 한 묶음. 왼쪽 칸에 이름과 설명, 오른쪽에 흰 판. 좁은 화면에서는 이름이 판 위로 올라간다.
 * 판마다 저장 버튼은 하나, 판 맨 아래 오른쪽(SaveBar)이다.
 */
export function SettingsSection({ id, title, description, children }: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <div className="lg:pt-4">
        <h2 id={id} className="text-base font-semibold text-[var(--ink)]"><UiText>{title}</UiText></h2>
        {description ? <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--muted)]"><UiText>{description}</UiText></p> : null}
      </div>
      <div className={cardClass}>{children}</div>
    </section>
  );
}

export function SaveBar({ state, pending, label }: {
  state: { status: string; message: string };
  pending: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-3">
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`min-w-0 flex-1 text-[0.8125rem] font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="button-secondary button-compact max-sm:w-full"><UiText>{pending ? "저장 중" : label}</UiText></button>
    </div>
  );
}
