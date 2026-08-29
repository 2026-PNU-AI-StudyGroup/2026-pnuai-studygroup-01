import Link from "next/link";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const adminNavigationItems = [
  { href: "/admin/professors", label: "교수 권한", icon: "professor" },
  { href: "/admin/users", label: "사용자", icon: "users" },
  { href: "/admin/emails", label: "이메일 전송", hint: "대기열과 실패 작업", icon: "email" },
  { href: "/admin/audit", label: "관리 이력", hint: "주요 변경 기록", icon: "audit" },
] as const;

function isAdminNavigationActive(href: string, currentPath: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function AdminNavigationIcon({ name }: { name: (typeof adminNavigationItems)[number]["icon"] }) {
  const paths = {
    professor: <><circle cx="10" cy="7" r="3" /><path d="M4 17c.4-4 2.4-6 6-6s5.6 2 6 6m-2-8 2 2 3-4" /></>,
    users: <><circle cx="7" cy="7" r="3" /><path d="M2 17c.3-4 2-6 5-6s4.7 2 5 6m2-10c2 0 3 1.3 3 3s-1 2.7-2.5 3M15 13c2.2.3 3.3 1.6 3.5 4" /></>,
    email: <><rect x="2.5" y="4" width="15" height="12" rx="1.5" /><path d="m3.5 5 6.5 5 6.5-5" /></>,
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
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"관리자"}</UiText></p>
        <h2 className="mt-1 text-sm font-bold tracking-[-0.02em]"><UiText>{"운영 관리"}</UiText></h2>
      </div>

      <UiNav aria-label="관리자 업무" className="lg:mt-5">
        <details className="group relative lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)]">
                <AdminNavigationIcon name={current.icon} />
              </span>
              <span className="min-w-0 text-left">
                <strong className="block truncate text-sm font-bold"><UiText>{current.label}</UiText></strong>
                {"hint" in current ? <span className="block truncate text-xs text-[var(--muted)]"><UiText>{current.hint}</UiText></span> : null}
              </span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.7] transition-transform group-open:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
          </summary>
          <ul className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 space-y-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-float)]">
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
        compact ? "min-h-12" : "hint" in item ? "min-h-[4.25rem]" : "min-h-12"
      } ${
        active
          ? "bg-[var(--primary-subtle)] text-[var(--primary)] before:absolute before:-left-3 before:inset-y-0 before:w-0.5 before:bg-[var(--primary)]"
          : "text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-[var(--surface)] text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted)]"}`}>
        <AdminNavigationIcon name={item.icon} />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.82rem] font-bold"><UiText>{item.label}</UiText></strong>
        {"hint" in item ? <span className={`mt-0.5 block truncate text-[0.66rem] font-semibold ${active ? "text-[var(--primary)]/75" : "text-[var(--muted)]"}`}><UiText>{item.hint}</UiText></span> : null}
      </span>
    </Link>
  );
}
