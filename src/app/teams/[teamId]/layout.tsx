import type { ReactNode } from "react";

export default function LegacyProjectTeamLayout({ children }: {
  children: ReactNode;
  params?: Promise<{ teamId: string }>;
}) {
  return children;
}
