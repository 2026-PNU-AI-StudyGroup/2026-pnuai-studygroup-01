import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

export default async function AdvisorLayout({ children }: { children: ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADVISOR" && actor.role !== "ADMIN") redirect("/topics");
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/advisor">
      {children}
    </AppShell>
  );
}
