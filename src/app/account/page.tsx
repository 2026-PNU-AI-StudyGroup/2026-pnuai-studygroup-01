import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

import { AccountControls } from "./account-controls";
import { StudentProfileForm } from "./student-profile-form";

export const metadata: Metadata = { title: "내 정보" };

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자" } as const;

export default async function AccountPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const profile = actor.role === "STUDENT" ? await new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor) : null;

  const shortcuts = actor.role === "STUDENT"
    ? [["프로젝트 탐색", "/topics"], ["내 프로젝트", "/dashboard"], ["팀원 모집", "/recruitments"]]
    : actor.role === "PROFESSOR"
      ? [["지도 프로젝트", "/dashboard"], ["주제 관리", "/professor/topics"], ["지원 검토", "/professor/applications"]]
      : [["전체 프로젝트", "/dashboard"], ["프로그램 관리", "/admin/programs"], ["교수 권한", "/admin/professors"]];

  return (
    <AppShell role={actor.role} userName={actor.name} currentPath="/account">
      <main className="content-shell">
        <div className="mx-auto max-w-3xl">
          <PageHeader eyebrow="계정" title="내 정보" description="현재 로그인한 부산대학교 계정과 서비스 역할을 확인합니다." />
          <section aria-labelledby="account-summary-heading" className="mt-10 border-y border-[var(--line)] py-8">
            <div className="flex items-start gap-5">
              <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg bg-[var(--accent-subtle)] text-xl font-extrabold text-[var(--accent-hover)]">{actor.name.trim().charAt(0) || "나"}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3"><h2 id="account-summary-heading" className="text-2xl font-extrabold tracking-[-0.025em]">{actor.name}</h2><StatusBadge>{roleLabel[actor.role]}</StatusBadge></div>
                <p className="muted mt-2 break-all text-sm">{actor.email}</p>
                <p className="muted mt-1 text-xs">부산대학교 Google Workspace 인증 계정</p>
              </div>
            </div>
          </section>
          <nav aria-label="계정 바로가기" className="grid border-b border-[var(--line)] sm:grid-cols-3">
            {shortcuts.map(([label, href]) => <Link key={href} href={href} className="snap-color flex min-h-14 items-center justify-between border-t border-[var(--line)] px-1 text-sm font-bold hover:text-[var(--accent-hover)] sm:border-t-0 sm:px-4 first:sm:pl-0 last:sm:pr-0">{label}<span aria-hidden="true">→</span></Link>)}
          </nav>
          {actor.role === "STUDENT" ? <div className="mt-12"><StudentProfileForm profile={profile} /></div> : null}
          <div className="mt-12"><AccountControls /></div>
        </div>
      </main>
    </AppShell>
  );
}
