import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CategoryOrderManager } from "@/app/admin/categories/_components/category-order-manager";
import { AdminSection } from "@/app/_components/admin-section";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { listOrderedProgramCategories } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("대분류 순서");
}

export default async function ProgramCategoryOrderAdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  const [categories, grouped] = await Promise.all([
    listOrderedProgramCategories(prisma),
    prisma.projectProgram.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);
  const programCounts = Object.fromEntries(grouped.map(({ category, _count }) => [category, _count._all]));

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/categories">
      <AdminWorkspace currentPath="/admin/categories" title="대분류 순서">
        <AdminSection id="category-order-title" title="사이드바에 세우는 차례">
          <p className="px-5 pt-4 text-sm text-[var(--muted)]">
            <UiText>{"프로젝트 목록 사이드바와 첫 화면에 열리는 프로그램이 이 차례를 따릅니다."}</UiText>
          </p>
          <CategoryOrderManager categories={categories} programCounts={programCounts} />
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}
