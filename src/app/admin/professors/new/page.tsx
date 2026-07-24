import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfessorAccessForm } from "@/app/admin/professors/_components/professor-access-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AppShell } from "@/app/_components/app-shell";

export const metadata: Metadata = { title: "교수 이메일 등록" };

export default async function NewProfessorPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors/new">
      <AdminWorkspace currentPath="/admin/professors/new" eyebrow="교수 권한 · 새 등록" title="교수 이메일 등록" description="교수 기능을 사용할 부산대학교 이메일을 사전에 허용합니다." actions={<Link className="button-secondary" href="/admin/professors">등록 취소</Link>}>
        <ProfessorAccessForm />
      </AdminWorkspace>
    </AppShell>
  );
}
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
