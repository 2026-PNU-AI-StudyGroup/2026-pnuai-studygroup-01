import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

import { AccountControls } from "@/app/account/_components/account-controls";
import { AccountSectionLayout } from "@/app/account/_components/account-section-layout";

export const metadata: Metadata = { title: "마이페이지" };

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
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/account">
      <AccountSectionLayout role={actor.role} currentPath="/account">
        <div className="max-w-3xl">
          <PageHeader eyebrow="계정" title="마이페이지" description="현재 로그인한 부산대학교 계정과 서비스 역할을 확인합니다." />
          <section aria-labelledby="account-summary-heading" className="mt-10 border-y border-[var(--line)] py-8">
            <div className="flex items-start gap-5">
              <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-xl font-extrabold text-[var(--primary-hover)]">{actor.name.trim().charAt(0) || "나"}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3"><h2 id="account-summary-heading" className="text-2xl font-extrabold tracking-[-0.025em]">{actor.name}</h2><StatusBadge>{roleLabel[actor.role]}</StatusBadge></div>
                <p className="muted mt-2 break-all text-sm">{actor.email}</p>
                <p className="muted mt-1 text-xs">부산대학교 Google Workspace 인증 계정</p>
              </div>
            </div>
          </section>
          <nav aria-label="주요 업무 바로가기" className="mt-10 grid border-t border-[var(--line)] sm:grid-cols-3">
            {shortcuts.map(([label, href]) => <Link key={href} href={href} className="record-row flex min-h-16 items-center justify-between border-b border-[var(--line)] px-3 text-sm font-bold hover:text-[var(--primary-hover)] sm:px-4 first:sm:pl-1">{label}<span aria-hidden="true">→</span></Link>)}
          </nav>
          {actor.role === "STUDENT" ? <section aria-labelledby="project-profile-heading" className="mt-12 border-y border-[var(--line)] py-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3"><h2 id="project-profile-heading" className="text-xl font-extrabold">프로젝트 프로필</h2><StatusBadge tone={profile ? "success" : "warning"}>{profile ? "작성 완료" : "작성 필요"}</StatusBadge></div>
                {profile ? <><p className="muted mt-3 text-sm leading-6">{profile.desiredRole} · {profile.availability}</p><ul aria-label="관심 분야와 보유 기술" className="mt-3 flex flex-wrap gap-2">{[...profile.interests, ...profile.skills].slice(0, 6).map((item) => <li key={item} className="rounded bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold">{item}</li>)}</ul></> : <p className="muted mt-3 max-w-xl text-sm leading-6">관심 분야와 보유 기술, 활동 가능 시간을 저장하면 프로젝트와 팀원 모집 지원서에 활용할 수 있습니다.</p>}
              </div>
              <Link className={profile ? "button-secondary" : "button-primary"} href="/account/profile">{profile ? "프로필 수정" : "프로필 작성"}</Link>
            </div>
          </section> : null}
          <div className="mt-12"><AccountControls /></div>
        </div>
      </AccountSectionLayout>
    </AppShell>
  );
}
