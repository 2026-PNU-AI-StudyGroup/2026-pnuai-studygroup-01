import type { ReactNode } from "react";

export type ProjectView = "active" | "past";

export function ProjectExplorerLayout({ children }: { children: ReactNode }) {
  return (
    <main className="content-shell py-6 lg:py-8">{children}</main>
  );
}
