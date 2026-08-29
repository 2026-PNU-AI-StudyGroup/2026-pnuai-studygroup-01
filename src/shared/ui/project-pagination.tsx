import Link from "next/link";

import { UiNav } from "@/shared/i18n/localized-elements";
import { UiText } from "@/shared/i18n/i18n-provider";
import { DisabledPaginationDirection, PaginationDirectionLink } from "@/shared/ui/icon-button";

type PageItem = number | "ellipsis";

function visiblePages(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  return visible.flatMap((value, index) => {
    const previous = visible[index - 1];
    return previous !== undefined && value - previous > 1 ? ["ellipsis", value] : [value];
  });
}

export function ProjectPagination({ page, totalPages, href, ariaLabel }: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
  ariaLabel: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <UiNav aria-label={ariaLabel} className="mt-8 border-t border-[var(--line)] pt-6">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-bold text-[var(--muted)]"><strong className="text-[var(--ink)]">{page}</strong> / {totalPages} <UiText>{"페이지"}</UiText></p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {page > 1 ? <PaginationDirectionLink direction="previous" href={href(page - 1)} /> : <DisabledPaginationDirection direction="previous" />}
          {visiblePages(page, totalPages).map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`} aria-hidden="true" className="grid size-10 place-items-center text-sm font-bold text-[var(--muted)]">…</span> : item === page ? <span key={item} aria-current="page" className="grid size-10 place-items-center rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-sm font-bold text-white">{item}</span> : <Link key={item} href={href(item)} aria-label={`${item} 페이지`} className="grid size-10 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]">{item}</Link>)}
          {page < totalPages ? <PaginationDirectionLink direction="next" href={href(page + 1)} /> : <DisabledPaginationDirection direction="next" />}
        </div>
      </div>
    </UiNav>
  );
}
