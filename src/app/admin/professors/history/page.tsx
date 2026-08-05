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
import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("교수 권한 변경 이력");
}

export default async function ProfessorHistoryPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const entries = await new ProfessorAccessService(
    new PrismaProfessorAccessRepository(prisma),
  ).listAudit(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors/history">
      <AdminWorkspace currentPath="/admin/professors/history" eyebrow="교수 권한 · 변경 이력" title="교수 권한 변경 이력" description="권한을 허용하거나 회수한 기록과 처리자를 시간순으로 살펴봅니다." actions={<Link className="button-secondary" href="/admin/professors"><UiText>{"권한 목록"}</UiText></Link>}>
        <AdminSection
          id="professor-audit-title"
          title="최근 권한 변경 기록"
          description="교수 이메일 권한의 허용·회수 이력과 처리자를 최신순으로 표시합니다."
          meta={<><UiText>{"최근"}</UiText>{" "}{entries.length}<UiText>{"건"}</UiText></>}
        >
          {entries.length === 0 ? (
            <AdminSectionEmpty>
              <EmptyState variant="embedded" title="아직 권한 변경 기록이 없습니다" description="권한을 바꾸면 기록이 자동으로 남습니다." action={<Link className="button-secondary" href="/admin/professors/new"><UiText>{"교수 이메일 추가"}</UiText></Link>} />
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
                    <p className="muted mt-1 text-xs"><UiText>{entry.action === "PROFESSOR_ACCESS_GRANTED" ? "교수 권한 허용" : "교수 권한 회수"}</UiText></p>
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
