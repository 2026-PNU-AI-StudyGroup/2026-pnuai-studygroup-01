import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AdminSection,
  AdminSectionEmpty,
  adminRecordListClassName,
  adminRecordRowClassName,
} from "@/app/_components/admin-section";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { ProgramIcon } from "@/shared/ui/program-icon";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로그램 관리");
}
const status = { DRAFT: ["초안", "neutral"], OPEN: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;

export default async function ProgramsAdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll(actor);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/programs">
      <AdminWorkspace currentPath="/admin/programs" title="프로그램" description="캡스톤과 대회, 교육 프로그램의 운영 기간과 공개 상태를 설정합니다." actions={programs.length > 0 ? <Link className="button-primary" href="/admin/programs/new"><UiText>{"새 프로그램"}</UiText></Link> : undefined}>
        <AdminSection
          id="program-list-title"
          title="프로그램 목록"
          meta={<><UiText>{"총"}</UiText>{" "}{programs.length}<UiText>{"개"}</UiText></>}
        >
          {programs.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState
                variant="embedded"
                title="아직 만든 프로그램이 없습니다"
                description="프로그램을 등록해 프로젝트 운영을 시작하세요."
                action={<Link className="button-primary" href="/admin/programs/new"><UiText>{"새 프로그램"}</UiText></Link>}
              />
            </AdminSectionEmpty>
          ) : (
            <ol className={adminRecordListClassName}>
              {programs.map((program) => (
                <li key={program.id} className={`${adminRecordRowClassName} grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,auto)] xl:items-center 2xl:grid-cols-[minmax(0,1.5fr)_12rem_10rem_minmax(14rem,auto)]`}>
                  <div className="min-w-0 xl:col-start-1 xl:row-start-1 2xl:col-auto 2xl:row-auto">
                    <div className="flex flex-wrap items-center gap-3">
                      <span aria-hidden="true" className="grid size-9 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--primary)]"><ProgramIcon icon={program.icon} className="size-5" /></span>
                      <h3 className="text-lg font-semibold tracking-[-0.02em]">{program.name}</h3>
                      <StatusBadge tone={status[program.status][1]}>{status[program.status][0]}</StatusBadge>
                    </div>
                    <p className="muted mt-1 text-sm"><UiText>{program.category}</UiText></p>
                    <p className="mt-2 line-clamp-2 text-sm"><UiText>{program.description}</UiText></p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 xl:col-start-1 xl:row-start-2 2xl:contents">
                    <dl className="min-w-0 text-sm"><dt className="muted text-xs"><UiText>{"운영 기간"}</UiText></dt><dd className="mt-1"><UiDate value={program.startsAt} mode="date" /><br /> – <UiDate value={program.endsAt} mode="date" /></dd></dl>
                    <dl className="min-w-0 text-sm"><dt className="muted text-xs"><UiText>{"프로젝트 등록"}</UiText></dt><dd className="mt-1"><UiDate value={program.projectRegistrationStartsAt ?? program.startsAt} mode="date" /><br /> – <UiDate value={program.projectRegistrationEndsAt ?? program.endsAt} mode="date" /></dd></dl>
                    <dl className="min-w-0 text-sm"><dt className="muted text-xs"><UiText>{"운영 현황"}</UiText></dt><dd className="mt-1"><UiText>{"주제"}</UiText>{" "}{program.topicCount} {" "}<UiText>{"· 팀"}</UiText>{" "}{program.teamCount}</dd></dl>
                  </div>
                  <div className="border-t border-[var(--line)] pt-4 text-right xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:border-t-0 xl:pt-0 2xl:col-start-4 2xl:row-start-1 2xl:row-span-1">
                    <div className="flex justify-end">
                      <Link href={`/admin/programs/${program.id}/settings`} className="button-primary"><UiText>{"관리"}</UiText></Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>
      </AdminWorkspace>
    </AppShell>
  );
}
