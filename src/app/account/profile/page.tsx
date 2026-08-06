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
  return getLocalizedMetadata("프로젝트 지원 정보");
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
          <div className="border-b border-[var(--line)] pb-9">
            <h2 className="text-lg font-bold tracking-[-0.02em]"><UiText>{"지원 정보 편집"}</UiText></h2>
          </div>
          <StudentProfileForm profile={profile} />
        </div>
      </AccountSectionLayout>
    </AppShell>
  );
}
