import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AcademicCycleForm } from "@/app/admin/academic-cycles/_components/academic-cycle-form";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AppShell } from "@/app/_components/app-shell";

export const metadata: Metadata = { title: "새 학기 등록" };

export default async function NewAcademicCyclePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/academic-cycles/new">
      <AdminWorkspace currentPath="/admin/academic-cycles/new" eyebrow="운영 학기 · 새로 만들기" title="새 운영 학기" description="프로그램이 공유할 학년도와 학기 기준을 정합니다." actions={<Link className="button-secondary" href="/admin/academic-cycles">학기 목록</Link>}>
        <AcademicCycleForm />
      </AdminWorkspace>
    </AppShell>
  );
}
