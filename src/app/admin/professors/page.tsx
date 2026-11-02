import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfessorAccessForm } from "@/app/admin/professors/_components/professor-access-form";
import { RevokeProfessorAccessForm } from "@/app/admin/professors/_components/revoke-professor-access-form";
import { AdminSidebar } from "@/app/_components/admin-sidebar";
import { AdminTabs, AdminWorkspace, adminHeadRow, adminRow } from "@/app/_components/admin-workspace";
import { ProfessorAccessService } from "@/modules/identity/application/manage-professor-access";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { cardClass, CardHead, Pill } from "@/modules/project-program/ui/work-screen";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("교수 권한 관리");
}

const roleLabel = { ADMIN: "관리자", PROFESSOR: "교수", ADVISOR: "자문위원", STUDENT: "학생" } as const;

// 이메일, 계정 역할, 담당 프로젝트, 최초 등록, 상태. 좁으면 앞 칸 아래 회색 한 줄로 흐른다.
const listColumns = "@min-[48rem]:grid-cols-[minmax(0,1fr)_5.5rem_6rem_7rem_7rem]";
const historyColumns = "@min-[48rem]:grid-cols-[minmax(0,1fr)_7rem_8rem_10rem]";

function Tabs({ tab, activeCount }: { tab: "list" | "history"; activeCount?: number }) {
  return (
    <AdminTabs
      label="교수 권한 보기"
      items={[
        { href: "/admin/professors", label: "권한 목록", count: activeCount, current: tab === "list" },
        { href: "/admin/professors?tab=history", label: "변경 이력", current: tab === "history" },
      ]}
    />
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
    const latest = entries[0];
    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors" crumbs={[{ label: "교수 권한" }]} panel={<AdminSidebar currentPath="/admin/professors" />}>
        <AdminWorkspace
          title="교수 권한"
          description={latest ? <><UiText>{"마지막 변경"}</UiText>{": "}<span className="tabular-nums"><UiDate value={latest.createdAt} mode="dateTime" /></span>, {latest.targetEmail} <UiText>{latest.action === "PROFESSOR_ACCESS_GRANTED" ? "권한 부여" : "권한 회수"}</UiText>, <UiText>{"처리자"}</UiText>{" "}{latest.actorName}.</> : undefined}
          tabs={<Tabs tab="history" />}
        >
          <section aria-labelledby="professor-audit-title" className={`${cardClass} @container`}>
            <CardHead id="professor-audit-title" title={<UiText>{"권한 변경 기록"}</UiText>} count={<><UiText>{"최근"}</UiText>{" "}{entries.length}<UiText>{"건"}</UiText></>} />
            {entries.length === 0 ? (
              <p className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"아직 권한 변경 기록이 없습니다. 권한을 바꾸면 기록이 자동으로 남습니다."}</UiText></p>
            ) : (
              <>
                <div aria-hidden="true" className={`${adminHeadRow} ${historyColumns}`}>
                  <span><UiText>{"이메일"}</UiText></span>
                  <span><UiText>{"변경"}</UiText></span>
                  <span><UiText>{"처리자"}</UiText></span>
                  <span className="text-right"><UiText>{"일시"}</UiText></span>
                </div>
                <ol>
                  {entries.map((entry) => (
                    <li key={entry.id} className={`${adminRow} grid-cols-[minmax(0,1fr)_auto] text-[0.8125rem] ${historyColumns}`}>
                      <p className="min-w-0 truncate text-sm font-medium text-[var(--ink)]">{entry.targetEmail}</p>
                      <span className="justify-self-end @min-[48rem]:justify-self-start">
                        <Pill tone={entry.action === "PROFESSOR_ACCESS_GRANTED" ? "plain" : "warning"}>{entry.action === "PROFESSOR_ACCESS_GRANTED" ? "권한 부여" : "권한 회수"}</Pill>
                      </span>
                      <span className="truncate text-[var(--muted)] @min-[48rem]:text-[var(--ink)]">{entry.actorName}</span>
                      <time className="tabular-nums text-[var(--muted)] @min-[48rem]:text-right" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </AdminWorkspace>
      </AppShell>
    );
  }

  const entries = await service.list(actor);
  const active = entries.filter((entry) => !entry.revokedAt);
  const notSignedIn = active.filter((entry) => !entry.account).length;
  const responsible = active.filter((entry) => entry.activeResponsibilityCount > 0).length;
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/professors" crumbs={[{ label: "교수 권한" }]} panel={<AdminSidebar currentPath="/admin/professors" />}>
      <AdminWorkspace
        title="교수 권한"
        description={active.length
          ? <><b className="font-semibold"><UiText>{`권한이 있는 이메일 ${active.length}개`}</UiText></b><UiText>{`, 그중 ${notSignedIn}개는 아직 로그인 전입니다.`}</UiText></>
          : <UiText>{"교수 권한이 있는 이메일이 없습니다."}</UiText>}
        tabs={<Tabs tab="list" activeCount={active.length} />}
      >
        <section aria-labelledby="professor-list-title" className={`${cardClass} @container`}>
          <CardHead id="professor-list-title" title={<UiText>{"교수 이메일"}</UiText>} count={<>{entries.length}<UiText>{"개"}</UiText></>} />
          <ProfessorAccessForm />
          {entries.length === 0 ? (
            <p className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"등록된 교수 이메일이 없습니다. 교수 계정이 로그인하기 전에 이메일을 등록하세요."}</UiText></p>
          ) : (
            <>
              <div aria-hidden="true" className={`${adminHeadRow} ${listColumns}`}>
                <span><UiText>{"이메일"}</UiText></span>
                <span><UiText>{"계정 역할"}</UiText></span>
                <span className="text-right"><UiText>{"담당 프로젝트"}</UiText></span>
                <span className="text-right"><UiText>{"최초 등록"}</UiText></span>
                <span className="text-right"><UiText>{"상태"}</UiText></span>
              </div>
              <ol>
                {entries.map((entry) => {
                  const role = entry.account ? roleLabel[entry.account.role] : "미연결";
                  return (
                    <li key={entry.id} className={`${adminRow} grid-cols-[minmax(0,1fr)_auto] ${listColumns}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ink)]">{entry.email}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          <UiText>{entry.account?.name ?? "로그인 전"}</UiText>
                          {/* 좁은 폭에서는 옆 칸이 숨으므로 여기 한 줄로 모은다. */}
                          <span className="@min-[48rem]:hidden">, <UiText>{role}</UiText>, <UiText>{`담당 ${entry.activeResponsibilityCount}건`}</UiText></span>
                        </p>
                      </div>
                      <span className="hidden text-[0.8125rem] text-[var(--ink)] @min-[48rem]:block"><UiText>{role}</UiText></span>
                      <span className={`hidden text-right text-[0.8125rem] tabular-nums @min-[48rem]:block ${entry.activeResponsibilityCount > 0 ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{entry.activeResponsibilityCount}<UiText>{"건"}</UiText></span>
                      <span className="hidden text-right text-[0.8125rem] tabular-nums text-[var(--muted)] @min-[48rem]:block"><UiDate value={entry.createdAt} mode="date" /></span>
                      <div className="col-start-2 row-start-1 flex justify-end @min-[48rem]:col-auto @min-[48rem]:row-auto">
                        {entry.revokedAt
                          ? <Pill>{<><UiDate value={entry.revokedAt} mode="date" />{" "}<UiText>{"회수"}</UiText></>}</Pill>
                          : <RevokeProfessorAccessForm email={entry.email} activeResponsibilityCount={entry.activeResponsibilityCount} />}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {responsible > 0 ? (
                <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]"><UiText>{`담당 프로젝트가 있는 ${responsible}명은 프로젝트를 인계하거나 마감한 뒤 권한을 회수할 수 있습니다.`}</UiText></p>
              ) : null}
            </>
          )}
        </section>
      </AdminWorkspace>
    </AppShell>
  );
}

