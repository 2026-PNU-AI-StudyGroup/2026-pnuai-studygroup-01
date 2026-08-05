import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProgramForm } from "@/app/admin/programs/_components/program-form";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AppShell } from "@/app/_components/app-shell";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("새 프로그램 등록");
}

export default async function NewProgramPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/programs/new">
      <AdminWorkspace currentPath="/admin/programs/new" eyebrow="프로그램 · 새로 만들기" title="새 프로그램" description="운영 기간과 공개할 프로그램 정보를 설정합니다." actions={<Link className="button-secondary" href="/admin/programs"><UiText>{"프로그램 목록"}</UiText></Link>}>
        <ProgramForm successHref="/admin/programs" />
      </AdminWorkspace>
    </AppShell>
  );
}
