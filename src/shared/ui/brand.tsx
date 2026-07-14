import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-3 font-extrabold tracking-[-0.025em] ${inverse ? "text-white" : "text-[var(--ink)]"}`}
      aria-label="PNU Project 홈"
    >
      <span>PNU Project</span>
      <span aria-hidden="true" className={`hidden border-l pl-3 text-[0.6875rem] font-semibold tracking-normal md:inline ${inverse ? "border-white/30 text-white/70" : "border-[var(--line)] text-[var(--muted)]"}`}>학과 프로젝트 포털</span>
    </Link>
  );
}
