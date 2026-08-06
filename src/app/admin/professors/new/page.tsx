import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfessorAccessForm } from "@/app/admin/professors/_components/professor-access-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AppShell } from "@/app/_components/app-shell";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("교수 이메일 등록");
}

export default async function NewProfessorPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors/new">
      <AdminWorkspace currentPath="/admin/professors/new" title="교수 이메일 추가" actions={<Link className="button-secondary" href="/admin/professors"><UiText>{"권한 목록"}</UiText></Link>}>
        <ProfessorAccessForm />
      </AdminWorkspace>
    </AppShell>
  );
}
