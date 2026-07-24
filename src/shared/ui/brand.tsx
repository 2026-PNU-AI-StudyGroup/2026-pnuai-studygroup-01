import Link from "next/link";

export function Brand({ inverse = false, href = "/", ariaLabel, compact = false }: { inverse?: boolean; href?: string; ariaLabel?: string; compact?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 shrink-0 items-center gap-3 font-extrabold tracking-[-0.035em] ${inverse ? "text-white" : "text-[var(--ink)]"}`}
      aria-label={ariaLabel ?? (href === "/" ? "부산대학교 학과 프로젝트 관리 홈" : "부산대학교 학과 프로젝트 탐색")}
    >
      <span aria-hidden="true" className={`relative grid size-10 place-items-center overflow-hidden rounded-[13px] ${inverse ? "bg-white text-[var(--primary)]" : "bg-[var(--primary)] text-white"}`}>
        <svg viewBox="0 0 32 32" className="size-6 fill-none stroke-current stroke-[3]">
          <circle cx="11" cy="16" r="6.5" />
          <circle cx="21" cy="16" r="6.5" />
          <path d="M13.5 11.2 18.5 20.8M13.5 20.8 18.5 11.2" strokeLinecap="round" />
        </svg>
      </span>
      {compact ? null : <span aria-hidden="true" className="text-[1.05rem] font-black">학과 프로젝트 관리</span>}
    </Link>
  );
}
