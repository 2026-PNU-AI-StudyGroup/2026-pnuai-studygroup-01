import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiInput, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRoleForm } from "@/app/admin/users/_components/user-role-form";
import { AdvisorProgramHistory } from "@/app/admin/users/_components/advisor-program-history";
import { UserStatusForm } from "@/app/admin/users/_components/user-status-form";
import { AdminSidebar } from "@/app/_components/admin-sidebar";
import { AdminPager, AdminWorkspace, adminHeadRow, adminRow, adminRowButton } from "@/app/_components/admin-workspace";
import {
  USER_LIST_ROLE_FILTERS,
  USER_LIST_STATUS_FILTERS,
  UserAdministrationService,
  resolveUserListRoleFilter,
  resolveUserListStatusFilter,
  type UserListRoleFilter,
  type UserListStatusFilter,
} from "@/modules/identity/application/manage-users";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaUserAdministrationRepository } from "@/modules/identity/infrastructure/prisma-user-administration-repository";
import { listAdvisorProgramHistory } from "@/modules/advisor/infrastructure/prisma-advisor-invitation-query";
import { cardClass, KpiStrip, Missing, Pill } from "@/modules/project-program/ui/work-screen";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { SearchIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("사용자 관리");
}

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자", ADVISOR: "자문위원" } as const;

const roleFilterLabel: Record<UserListRoleFilter, string> = {
  ALL: "전체",
  STUDENT: "학생",
  PROFESSOR: "교수",
  ADMIN: "관리자",
  ADVISOR: "자문위원",
};

const statusFilterLabel: Record<UserListStatusFilter, string> = {
  ALL: "전체",
  ACTIVE: "활성",
  INACTIVE: "비활성",
};

// 사용자, 역할, 가입, 마지막 로그인, 작업. 좁으면 앞 칸 아래 회색 한 줄로 흐른다.
const columns = "@min-[48rem]:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_6.5rem_minmax(0,15rem)]";

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<{ q?: SearchParamValue; page?: SearchParamValue; role?: SearchParamValue; status?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const params = await searchParams;
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const roleFilter = resolveUserListRoleFilter(firstSearchParam(params.role));
  const statusFilter = resolveUserListStatusFilter(firstSearchParam(params.status));
  const [data, groups] = await Promise.all([
    new UserAdministrationService(new PrismaUserAdministrationRepository(prisma)).list(actor, query, requestedPage, { role: roleFilter, status: statusFilter }),
    // 역할 칸과 상태 칸의 숫자. 검색어 안에서 세어 지금 보는 목록과 어긋나지 않게 한다.
    prisma.user.groupBy({
      by: ["role", "accountStatus"],
      where: query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {},
      _count: { _all: true },
    }),
  ]);
  // 자문위원은 계정만 봐서는 무엇을 하는 사람인지 알 수 없다. 어느 프로그램 심사단이었는지가
  // 그 계정의 내용이고, 계정 상태도 거기서 나온다. 사람마다 조회하지 않고 이 쪽 전원을 한 번에 받는다.
  const advisorHistory = await listAdvisorProgramHistory(
    prisma,
    data.items.filter((user) => user.role === "ADVISOR").map((user) => user.id),
  );
  const filtered = roleFilter !== "ALL" || statusFilter !== "ALL";
  const statusMatches = (status: UserListStatusFilter, accountStatus: string) =>
    status === "ALL" || (status === "ACTIVE") === (accountStatus === "ACTIVE");
  const countWhere = (role: UserListRoleFilter, status: UserListStatusFilter) => groups
    .filter((group) => (role === "ALL" || group.role === role) && statusMatches(status, group.accountStatus))
    .reduce((sum, group) => sum + group._count._all, 0);
  const everyone = countWhere("ALL", "ALL");
  const inactive = countWhere("ALL", "INACTIVE");
  // 필터를 바꾸면 결과 수가 달라지므로 페이지는 항상 처음으로 되돌린다.
  const listHref = (next: { role?: UserListRoleFilter; status?: UserListStatusFilter; page?: number }) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    const role = next.role ?? roleFilter;
    const status = next.status ?? statusFilter;
    if (role !== "ALL") search.set("role", role);
    if (status !== "ALL") search.set("status", status);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const queryString = search.toString();
    return queryString ? `/admin/users?${queryString}` : "/admin/users";
  };

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/users" crumbs={[{ label: "사용자" }]} panel={<AdminSidebar currentPath="/admin/users" />}>
      <AdminWorkspace
        title="사용자"
        description={query
          ? <UiText>{`"${query}" 검색 결과 ${everyone}명, 그중 비활성 계정 ${inactive}명.`}</UiText>
          : <><b className="font-semibold"><UiText>{`가입 ${everyone}명`}</UiText></b><UiText>{inactive ? `, 그중 ${inactive}명은 비활성 계정이라 로그인할 수 없습니다.` : ", 비활성 계정은 없습니다."}</UiText></>}
      >
        {/* 역할 칸이 곧 역할 필터다. 숫자는 지금 고른 상태 안에서 센다. */}
        <UiNav aria-label="역할 필터">
          <KpiStrip items={USER_LIST_ROLE_FILTERS.map((filter) => ({
            label: roleFilterLabel[filter],
            value: countWhere(filter, statusFilter),
            unit: "명",
            href: listHref({ role: filter }),
            current: filter === roleFilter,
          }))} />
        </UiNav>
        <section aria-labelledby="user-list-title" className={`${cardClass} @container`}>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-5 pb-3 pt-4">
            <h2 id="user-list-title" className="text-base font-semibold text-[var(--ink)]"><UiText>{roleFilter === "ALL" ? "가입 사용자" : roleFilterLabel[roleFilter]}</UiText></h2>
            <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{data.total.toLocaleString("ko-KR")}<UiText>{"명"}</UiText></span>
            <UiNav aria-label="계정 상태 필터" className="ml-1 inline-flex rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-0.5">
              {USER_LIST_STATUS_FILTERS.map((filter) => {
                const selected = filter === statusFilter;
                return (
                  <Link
                    key={filter}
                    href={listHref({ status: filter })}
                    aria-current={selected ? "page" : undefined}
                    className={`inline-flex h-7 items-center gap-1 rounded-[0.3125rem] px-2.5 text-[0.8125rem] font-medium transition-colors ${selected ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_0_0_1px_var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                  >
                    <UiText>{statusFilterLabel[filter]}</UiText>
                    <span className="font-normal tabular-nums text-[var(--muted)]">{countWhere(roleFilter, filter)}</span>
                  </Link>
                );
              })}
            </UiNav>
            <form role="search" className="w-full sm:ml-auto sm:w-72">
              {roleFilter !== "ALL" ? <input type="hidden" name="role" value={roleFilter} /> : null}
              {statusFilter !== "ALL" ? <input type="hidden" name="status" value={statusFilter} /> : null}
              <label className="relative block">
                <span className="sr-only"><UiText>{"이름 또는 이메일 검색"}</UiText></span>
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <UiInput className="form-control h-8 min-h-8 w-full bg-[var(--surface)] py-0 pl-8 text-[0.8125rem]" type="search" name="q" maxLength={100} defaultValue={query} placeholder="이름 또는 이메일 검색" />
              </label>
            </form>
          </div>
          {data.items.length === 0 ? (
            <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-[var(--ink)]"><UiText>{query || filtered ? "조건에 맞는 사용자가 없습니다" : "아직 가입한 사용자가 없습니다"}</UiText></h3>
                <p className="mt-0.5 text-[var(--muted)]"><UiText>{query || filtered ? "검색어나 필터를 지우고 다시 확인해 주세요." : "사용자가 처음 로그인하면 이 목록에 표시됩니다."}</UiText></p>
              </div>
              {query || filtered ? <Link href="/admin/users" className={adminRowButton}><UiText>{"검색 초기화"}</UiText></Link> : null}
            </div>
          ) : (
            <>
              <div aria-hidden="true" className={`${adminHeadRow} ${columns}`}>
                <span><UiText>{"사용자"}</UiText></span>
                <span><UiText>{"역할"}</UiText></span>
                <span className="text-right"><UiText>{"가입"}</UiText></span>
                <span className="text-right"><UiText>{"마지막 로그인"}</UiText></span>
                <span className="text-right"><UiText>{"작업"}</UiText></span>
              </div>
              <ol>
                {data.items.map((user) => (
                  <li key={user.id} className={`${adminRow} grid-cols-[minmax(0,1fr)] ${columns}`}>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h3 className="truncate text-sm font-medium text-[var(--ink)]">{user.name}</h3>
                        {/* 활성은 기본 상태다. 다른 상태만 표시한다. */}
                        {user.isActive ? null : <Pill tone="danger">{"비활성"}</Pill>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {user.email}
                        <span className="@min-[48rem]:hidden">, <UiText>{roleLabel[user.role]}</UiText>, <UiText>{"가입"}</UiText> <UiDate value={user.createdAt} mode="date" /></span>
                      </p>
                    </div>
                    <span className="hidden text-[0.8125rem] text-[var(--ink)] @min-[48rem]:block"><UiText>{roleLabel[user.role]}</UiText></span>
                    <time className="hidden text-right text-[0.8125rem] tabular-nums text-[var(--muted)] @min-[48rem]:block" dateTime={user.createdAt.toISOString()}>
                      <span className="sr-only"><UiText>{"가입일"}</UiText>{" "}</span>
                      <UiDate value={user.createdAt} mode="date" />
                    </time>
                    <span className="hidden text-right text-[0.8125rem] tabular-nums text-[var(--muted)] @min-[48rem]:block">
                      {user.lastSignedInAt ? (
                        <time dateTime={user.lastSignedInAt.toISOString()}>
                          <span className="sr-only"><UiText>{"마지막 로그인"}</UiText>{" "}</span>
                          <UiDate value={user.lastSignedInAt} mode="date" />
                        </time>
                      ) : <Missing />}
                    </span>
                    {user.id === actor.id ? (
                      <div className="flex justify-end"><Pill tone="accent">{"내 계정"}</Pill></div>
                    ) : (
                      <div className="flex min-w-0 flex-wrap items-start justify-end gap-2">
                        <UserStatusForm
                          userId={user.id}
                          name={user.name}
                          isActive={user.isActive}
                          activeResponsibilityCount={user.activeResponsibilityCount}
                          managedByInvitations={user.role === "ADVISOR"}
                        />
                        {user.isActive ? <UserRoleForm userId={user.id} name={user.name} role={user.role} isSelf={false} /> : null}
                        {user.role === "ADVISOR" ? <AdvisorProgramHistory name={user.name} history={advisorHistory.get(user.id) ?? []} /> : null}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
          <AdminPager label="사용자 목록 페이지" page={data.page} totalPages={data.totalPages} pageSize={50} total={data.total} href={(page) => listHref({ page })} />
        </section>
      </AdminWorkspace>
    </AppShell>
  );
}
