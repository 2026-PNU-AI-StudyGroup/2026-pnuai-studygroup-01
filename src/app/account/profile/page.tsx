import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StudentProfileForm } from "@/app/account/_components/student-profile-form";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { PageHeader } from "@/shared/ui/page-primitives";
import { AccountSectionLayout } from "@/app/account/_components/account-section-layout";

export const metadata: Metadata = { title: "프로젝트 프로필" };

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
        <div className="max-w-3xl space-y-10">
          <PageHeader eyebrow="계정" title="프로젝트 프로필" description="프로젝트와 팀원 모집에 지원할 때 반복해서 사용하는 정보를 관리합니다. 여러 관심 분야와 기술은 쉼표로 구분해 주세요." actions={<Link className="button-quiet" href="/account">마이페이지로</Link>} />
          <StudentProfileForm profile={profile} />
        </div>
      </AccountSectionLayout>
    </AppShell>
  );
}
