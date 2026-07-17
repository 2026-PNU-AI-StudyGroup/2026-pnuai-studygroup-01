import type { ReactNode } from "react";

export type ProjectView = "active" | "past";

export function ProjectExplorerLayout({ children }: { children: ReactNode }) {
  return (
    <main className="content-shell pt-10 lg:pt-14">{children}</main>
  );
}
