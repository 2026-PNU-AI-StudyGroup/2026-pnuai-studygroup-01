import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudentProfileForm } from "@/app/account/_components/student-profile-form";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { AccountSectionLayout } from "@/app/account/_components/account-section-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 프로필");
}

export default async function StudentProfilePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/account");
  const profile = await new StudentProfileService(
    new PrismaStudentProfileRepository(prisma),
  ).get(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/account/profile">
      <AccountSectionLayout role={actor.role} currentPath="/account/profile">
        <div>
          <div className="grid gap-6 border-b border-[var(--line)] pb-9 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
            <div>
              <h2 className="text-lg font-extrabold tracking-[-0.02em]"><UiText>{"프로필 편집"}</UiText></h2>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                <UiText>{"관심 분야와 기여할 수 있는 역량, 함께할 수 있는 시간을 최신 상태로 유지하세요."}</UiText></p>
              <Link className="button-secondary" href="/account"><UiText>{"계정 정보"}</UiText></Link>
            </div>
          </div>
          <StudentProfileForm profile={profile} />
        </div>
      </AccountSectionLayout>
    </AppShell>
  );
}
