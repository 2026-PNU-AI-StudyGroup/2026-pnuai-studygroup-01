import Link from "next/link";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";

type ProgramManagementSection = "settings" | "divisions" | "votes" | "rubric";

const items: Array<{ section: ProgramManagementSection; label: string; href: (programId: string) => string }> = [
  { section: "settings", label: "설정", href: (programId) => `/admin/programs/${programId}/settings` },
  { section: "divisions", label: "분과", href: (programId) => `/admin/programs/${programId}/tracks` },
  { section: "votes", label: "투표", href: (programId) => `/admin/programs/${programId}/votes` },
  { section: "rubric", label: "채점표", href: (programId) => `/admin/programs/${programId}/rubric` },
];

export function ProgramManagementNav({ programId, current }: { programId: string; current: ProgramManagementSection }) {
  return (
    <UiNav aria-label="프로그램 관리 메뉴" className="-mx-1 flex gap-2 overflow-x-auto border-b border-[var(--line)] pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = item.section === current;
        return (
          <Link
            key={item.section}
            href={item.href(programId)}
            aria-current={active ? "page" : undefined}
            className={`min-h-10 shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${active ? "bg-[var(--primary)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}
          >
            <UiText>{item.label}</UiText>
          </Link>
        );
      })}
    </UiNav>
  );
}
