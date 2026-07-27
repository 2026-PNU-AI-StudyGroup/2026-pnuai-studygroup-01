import Link from "next/link";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const adminNavigationItems = [
  { href: "/project-approvals", label: "프로젝트 승인", hint: "학생 제안 검토", icon: "approval" },
  { href: "/admin/programs", label: "프로그램", hint: "개설과 공개 상태", icon: "program" },
  { href: "/admin/academic-cycles", label: "운영 학기", hint: "연도와 학기 기준", icon: "calendar" },
  { href: "/admin/professors", label: "교수 권한", hint: "교수 접근 승인", icon: "professor" },
  { href: "/admin/users", label: "사용자", hint: "계정 상태 관리", icon: "users" },
  { href: "/admin/audit", label: "감사 기록", hint: "중요 변경 추적", icon: "audit" },
] as const;

function isAdminNavigationActive(href: string, currentPath: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function AdminNavigationIcon({ name }: { name: (typeof adminNavigationItems)[number]["icon"] }) {
  const paths = {
    approval: <><path d="M5 3h10v14H5z" /><path d="m8 10 2 2 4-5" /></>,
    program: <><rect x="3" y="3" width="6" height="6" /><rect x="11" y="3" width="6" height="6" /><rect x="3" y="11" width="6" height="6" /><rect x="11" y="11" width="6" height="6" /></>,
    calendar: <><path d="M4 5h12v12H4zM7 3v4m6-4v4M4 9h12" /></>,
    professor: <><circle cx="10" cy="7" r="3" /><path d="M4 17c.4-4 2.4-6 6-6s5.6 2 6 6m-2-8 2 2 3-4" /></>,
    users: <><circle cx="7" cy="7" r="3" /><path d="M2 17c.3-4 2-6 5-6s4.7 2 5 6m2-10c2 0 3 1.3 3 3s-1 2.7-2.5 3M15 13c2.2.3 3.3 1.6 3.5 4" /></>,
    audit: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2M15.5 15.5 18 18" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
      {paths[name]}
    </svg>
  );
}

export function AdminSidebar({ currentPath }: { currentPath: string }) {
  const current = adminNavigationItems.find((item) => isAdminNavigationActive(item.href, currentPath))
    ?? adminNavigationItems[0];

  return (
    <div className="px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-3 lg:py-8">
      <div className="hidden px-2 lg:block">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"관리자"}</UiText></p>
        <h2 className="mt-1 text-sm font-black tracking-[-0.02em]"><UiText>{"관리 메뉴"}</UiText></h2>
      </div>

      <UiNav aria-label="관리자 업무" className="lg:mt-5">
        <details className="group relative lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-white px-3 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)]">
                <AdminNavigationIcon name={current.icon} />
              </span>
              <span className="min-w-0 text-left">
                <strong className="block truncate text-sm font-black"><UiText>{current.label}</UiText></strong>
                <span className="block truncate text-xs text-[var(--muted)]"><UiText>{current.hint}</UiText></span>
              </span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.7] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
          </summary>
          <ul className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 space-y-1 rounded-lg border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-float)]">
            {adminNavigationItems.map((item) => (
              <li key={item.href}>
                <AdminNavigationLink item={item} active={isAdminNavigationActive(item.href, currentPath)} compact />
              </li>
            ))}
          </ul>
        </details>

        <ul className="hidden space-y-1 lg:block">
          {adminNavigationItems.map((item) => (
            <li key={item.href}>
              <AdminNavigationLink item={item} active={isAdminNavigationActive(item.href, currentPath)} />
            </li>
          ))}
        </ul>
      </UiNav>
    </div>
  );
}

function AdminNavigationLink({ item, active, compact = false }: {
  item: (typeof adminNavigationItems)[number];
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 text-left transition-colors ${
        compact ? "min-h-12" : "min-h-[4.25rem]"
      } ${
        active
          ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>
        <AdminNavigationIcon name={item.icon} />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.82rem] font-black"><UiText>{item.label}</UiText></strong>
        <span className={`mt-0.5 block truncate text-[0.66rem] font-semibold ${active ? "text-[var(--primary)]/75" : "text-[var(--muted)]"}`}><UiText>{item.hint}</UiText></span>
      </span>
    </Link>
  );
}
