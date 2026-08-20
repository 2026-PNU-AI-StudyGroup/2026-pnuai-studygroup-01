import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AdminSection,
  AdminSectionEmpty,
  adminRecordListClassName,
} from "@/app/_components/admin-section";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { CategoryRenameForm } from "@/app/admin/program-categories/_components/category-rename-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로그램 분류");
}

// 분류는 별도 테이블이 아니라 프로그램에 붙은 문자열이다. 목록은 실제로 쓰인 값에서 뽑는다.
export default async function ProgramCategoriesAdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const rows = await prisma.projectProgram.groupBy({
    by: ["category"],
    _count: { _all: true },
    orderBy: { category: "asc" },
  });
  const categories = rows.filter(({ category }) => category.trim().length > 0);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/program-categories">
      <AdminWorkspace
        currentPath="/admin/program-categories"
        title="프로그램 분류"
        description="프로그램 목록을 나누는 분류 이름을 바꿉니다. 이미 있는 이름을 넣으면 두 분류가 하나로 합쳐집니다."
      >
        <AdminSection
          id="program-category-list-title"
          title="사용 중인 분류"
          meta={<><UiText>{"총"}</UiText>{" "}{categories.length}<UiText>{"개"}</UiText></>}
        >
          {categories.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState variant="section" title="아직 분류가 없습니다" description="프로그램을 만들 때 분류를 입력하면 이 목록에 표시됩니다." />
            </AdminSectionEmpty>
          ) : (
            <ol className={adminRecordListClassName}>
              {categories.map(({ category, _count }) => (
                <li
                  key={category}
                  className="record-row grid gap-x-4 gap-y-2 px-5 py-3 sm:px-6 md:grid-cols-[minmax(9rem,1fr)_6rem_auto] md:items-center"
                >
                  <h3 className="truncate font-semibold">{category}</h3>
                  <p className="muted text-sm md:whitespace-nowrap">
                    <UiText>{"프로그램"}</UiText>{" "}{_count._all}<UiText>{"개"}</UiText>
                  </p>
                  <CategoryRenameForm category={category} />
                </li>
              ))}
            </ol>
          )}
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}
