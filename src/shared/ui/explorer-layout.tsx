import type { ReactNode } from "react";

/** 프로그램 목록이 있는 화면의 본문 칸. 목록은 AppShell 의 panel 로 넘겨 왼쪽 메뉴에 둔다. */
export function ExplorerLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)]">
      <div className="min-w-0 px-5 pb-24 pt-6 sm:px-8 lg:px-10 lg:pb-12 lg:pt-8 xl:px-12 2xl:px-14">
        {children}
      </div>
    </main>
  );
}
