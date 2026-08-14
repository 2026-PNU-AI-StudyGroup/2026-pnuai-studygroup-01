import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfileImageRepository } from "@/modules/identity/infrastructure/prisma-profile-image-repository";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

import { AccountSectionLayout } from "@/app/account/_components/account-section-layout";
import { ProfilePhotoEditor } from "@/app/account/_components/profile-photo-editor";
import { StudentAccountForm } from "@/app/account/_components/student-account-form";
import { StudentProfileForm } from "@/app/account/_components/student-profile-form";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("내 계정");
}

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자", ADVISOR: "자문위원" } as const;

export default async function AccountPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const profile = actor.role === "STUDENT" ? await new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor) : null;
  const account = actor.role === "STUDENT"
    ? await prisma.user.findUnique({ where: { id: actor.id }, select: { department: true, studentNumber: true, grade: true, contactEmail: true } })
    : null;
  const profileImage = await new PrismaProfileImageRepository(prisma).findForOwner(actor.id);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/account">
      <AccountSectionLayout>
        <div className="grid gap-10">
          <section aria-labelledby="account-summary-heading" className="grid gap-6 border-y border-[var(--line)] py-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
            <div>
              <h2 id="account-summary-heading" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"기본 정보"}</UiText></h2>
            </div>
            <div className="min-w-0">
              <div className="pb-8">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-bold tracking-[-0.035em]">{actor.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{roleLabel[actor.role]}</p>
                </div>
              </div>
              <dl className="border-t border-[var(--line)] text-sm">
                <div className="grid gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold text-[var(--muted)]"><UiText>{"이메일"}</UiText></dt>
                  <dd className="break-all font-semibold text-[var(--ink)]">{actor.email}</dd>
                </div>
                <div className="grid gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold text-[var(--muted)]"><UiText>{"인증"}</UiText></dt>
                  <dd className="font-semibold text-[var(--ink)]"><UiText>{"부산대학교 Google Workspace"}</UiText></dd>
                </div>
              </dl>
              <div className="border-b border-[var(--line)] py-5">
                <ProfilePhotoEditor userId={actor.id} initialUpdatedAt={profileImage?.updatedAt ?? null} />
              </div>
            </div>
          </section>

          {actor.role === "STUDENT" ? (
            <section aria-labelledby="academic-info-heading" className="grid gap-6 border-b border-[var(--line)] py-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
              <div>
                <h2 id="academic-info-heading" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"학사 정보"}</UiText></h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{"학과·학번·학년과 자주 쓰는 이메일입니다. 팀 구성원 정보에 표시됩니다."}</UiText></p>
              </div>
              <div className="min-w-0">
                <StudentAccountForm info={{ department: account?.department ?? "", studentNumber: account?.studentNumber ?? "", grade: account?.grade ?? null, contactEmail: account?.contactEmail ?? "" }} />
              </div>
            </section>
          ) : null}

          {actor.role === "STUDENT" ? (
            <section aria-labelledby="project-profile-heading" className="grid gap-6 border-b border-[var(--line)] py-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
              <div>
                <h2 id="project-profile-heading" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"연락처"}</UiText></h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{"운영진과 같은 팀 팀원에게만 공개되며, 사이트 안에서 서로 연락할 때 사용됩니다."}</UiText></p>
              </div>
              <div className="min-w-0">
                <StudentProfileForm profile={profile} />
              </div>
            </section>
          ) : null}
        </div>
      </AccountSectionLayout>
    </AppShell>
  );
}
