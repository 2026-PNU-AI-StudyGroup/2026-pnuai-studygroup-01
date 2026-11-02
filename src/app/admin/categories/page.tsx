import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CategoryOrderManager } from "@/app/admin/categories/_components/category-order-manager";
import { AdminSidebar } from "@/app/_components/admin-sidebar";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { listOrderedProgramCategories } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("대분류 순서");
}

// 이 차례를 따르는 화면. 순서를 바꾸면 어디가 달라지는지 옆에서 바로 보이게 한다.
const followers = [
  { href: "/topics", label: "프로젝트 현황", detail: "사이드바 대분류 차례, 처음 열리는 프로그램" },
  { href: "/topics/manage", label: "프로그램 관리", detail: "사이드바 대분류 차례, 처음 열리는 프로그램" },
] as const;

export default async function ProgramCategoryOrderAdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");

  const [categories, programs] = await Promise.all([
    listOrderedProgramCategories(prisma),
    // 사이드바처럼 대분류 안에서는 최근에 시작한 프로그램부터 적는다.
    prisma.projectProgram.findMany({ orderBy: { startsAt: "desc" }, select: { name: true, category: true } }),
  ]);
  const programNames: Record<string, string[]> = {};
  for (const program of programs) (programNames[program.category] ??= []).push(program.name);
  const first = categories[0];

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/categories" crumbs={[{ label: "대분류 순서" }]} panel={<AdminSidebar currentPath="/admin/categories" />}>
      <AdminWorkspace
        title="대분류 순서"
        description={first
          ? <UiText>{`대분류 ${categories.length}개에 프로그램 ${programs.length}개가 있습니다. 맨 위 ${first}의 최근 프로그램이 첫 화면에 열립니다.`}</UiText>
          : undefined}
      >
        <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="category-order-title" className={cardClass}>
            <CardHead id="category-order-title" title={<UiText>{"사이드바에 세우는 차례"}</UiText>} count={<>{categories.length}<UiText>{"개"}</UiText></>} />
            <CategoryOrderManager categories={categories} programNames={programNames} />
          </section>
          <section aria-labelledby="category-followers-title" className={cardClass}>
            <CardHead id="category-followers-title" title={<UiText>{"이 차례를 따르는 화면"}</UiText>} />
            <ul className="px-5 pb-3">
              {followers.map((follower) => (
                <li key={follower.href} className="py-2.5 text-[0.8125rem] [&+li]:border-t [&+li]:border-[var(--line)]">
                  <Link href={follower.href} className="font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]"><UiText>{follower.label}</UiText></Link>
                  <p className="mt-0.5 text-xs text-[var(--muted)]"><UiText>{follower.detail}</UiText></p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </AdminWorkspace>
    </AppShell>
  );
}
