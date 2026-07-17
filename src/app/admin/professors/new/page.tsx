import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfessorAccessForm } from "@/app/admin/professors/professor-access-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AppShell } from "@/shared/ui/app-shell";
import { PageHeader } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "교수 이메일 등록" };

export default async function NewProfessorPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors/new">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="권한 등록" title="교수 이메일 등록" description="교수 기능을 사용할 부산대학교 이메일을 사전에 허용합니다." actions={<Link className="button-quiet" href="/admin/professors">교수 권한 목록으로</Link>} />
        <ProfessorAccessForm />
      </main>
    </AppShell>
  );
}
