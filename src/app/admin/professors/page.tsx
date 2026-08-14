import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfessorAccessForm } from "@/app/admin/professors/_components/professor-access-form";
import { RevokeProfessorAccessForm } from "@/app/admin/professors/_components/revoke-professor-access-form";
import {
  AdminSection,
  AdminSectionEmpty,
  adminRecordListClassName,
  adminRecordRowClassName,
} from "@/app/_components/admin-section";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("교수 권한 관리");
}

function TabLinks({ tab }: { tab: "list" | "history" }) {
  return (
    <>
      <Link className={tab === "list" ? "button-primary" : "button-secondary"} href="/admin/professors"><UiText>{"권한 목록"}</UiText></Link>
      <Link className={tab === "history" ? "button-primary" : "button-secondary"} href="/admin/professors?tab=history"><UiText>{"변경 이력"}</UiText></Link>
    </>
  );
}

export default async function ProfessorsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const tab = (await searchParams).tab === "history" ? "history" : "list";
  const service = new ProfessorAccessService(new PrismaProfessorAccessRepository(prisma));

  if (tab === "history") {
    const entries = await service.listAudit(actor);
    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors">
        <AdminWorkspace currentPath="/admin/professors" title="교수 권한" description="권한을 부여하거나 회수한 기록과 처리자를 시간순으로 확인합니다." actions={<TabLinks tab="history" />}>
          <AdminSection
            id="professor-audit-title"
            title="최근 권한 변경 기록"
            meta={<><UiText>{"최근"}</UiText>{" "}{entries.length}<UiText>{"건"}</UiText></>}
          >
            {entries.length === 0 ? (
              <AdminSectionEmpty>
                <EmptyState variant="embedded" title="아직 권한 변경 기록이 없습니다" description="권한을 바꾸면 기록이 자동으로 남습니다." />
              </AdminSectionEmpty>
            ) : (
              <ol className={adminRecordListClassName}>
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className={`${adminRecordRowClassName} grid gap-5 text-sm xl:grid-cols-[minmax(18rem,1fr)_minmax(9rem,11rem)_minmax(12rem,auto)] xl:items-center`}
                  >
                    <div className="min-w-0">
                      <strong className="break-words font-semibold">{entry.targetEmail}</strong>
                      <p className="muted mt-1 text-xs"><UiText>{entry.action === "PROFESSOR_ACCESS_GRANTED" ? "교수 권한 부여" : "교수 권한 회수"}</UiText></p>
                    </div>
                    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 sm:items-end xl:contents">
                      <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-1 xl:block">
                        <dt className="muted text-xs"><UiText>{"처리자"}</UiText></dt>
                        <dd className="xl:mt-1">{entry.actorName}</dd>
                      </dl>
                      <time className="muted text-xs sm:text-right" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time>
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

  const entries = await service.list(actor);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors">
      <AdminWorkspace currentPath="/admin/professors" title="교수 권한" description="교수 권한을 부여할 부산대학교 이메일을 등록하고, 더 이상 필요하지 않은 권한을 회수합니다." actions={<TabLinks tab="list" />}>
        <AdminSection id="professor-register-title" title="교수 이메일 등록">
          <ProfessorAccessForm />
        </AdminSection>
        <AdminSection
          id="professor-list-title"
          title="교수 권한 목록"
          meta={<><UiText>{"총"}</UiText>{" "}{entries.length}<UiText>{"개"}</UiText></>}
        >
          {entries.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState variant="embedded" title="등록된 교수 이메일이 없습니다" description="교수 계정이 로그인하기 전에 이메일을 등록하세요." />
            </AdminSectionEmpty>
          ) : (
            <ol className={adminRecordListClassName}>
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className={`${adminRecordRowClassName} grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center 2xl:grid-cols-[minmax(18rem,1fr)_minmax(9rem,11rem)_minmax(9rem,11rem)_auto]`}
                >
                  <div className="min-w-0 xl:col-start-1 xl:row-start-1 2xl:col-auto 2xl:row-auto">
                    <p className="break-words font-semibold">{entry.email}</p>
                    <p className="muted mt-1 text-xs"><UiText>{entry.account?.name ?? "로그인 전"}</UiText></p>
                  </div>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:col-start-1 xl:row-start-2 2xl:contents">
                    <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-1 text-sm 2xl:block">
                      <dt className="muted 2xl:text-xs"><UiText>{"계정 역할"}</UiText></dt>
                      <dd className="2xl:mt-1"><UiText>{entry.account ? entry.account.role === "ADMIN" ? "관리자" : entry.account.role === "PROFESSOR" ? "교수" : entry.account.role === "ADVISOR" ? "자문위원" : "학생" : "미연결"}</UiText></dd>
                    </dl>
                    <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-1 text-sm 2xl:block">
                      <dt className="muted 2xl:text-xs"><UiText>{"최초 등록"}</UiText></dt>
                      <dd className="2xl:mt-1"><UiDate value={entry.createdAt} mode="date" /></dd>
                    </dl>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:justify-end 2xl:col-auto 2xl:row-auto 2xl:row-span-1">
                    {entry.revokedAt ? (
                      <StatusBadge tone="neutral"><UiDate value={entry.revokedAt} mode="date" /> {" "}<UiText>{"회수"}</UiText></StatusBadge>
                    ) : (
                      <><StatusBadge><UiText>{"권한 부여"}</UiText></StatusBadge><RevokeProfessorAccessForm email={entry.email} activeResponsibilityCount={entry.activeResponsibilityCount} /></>
                    )}
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
