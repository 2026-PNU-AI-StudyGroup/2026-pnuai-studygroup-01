import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-3 rounded-lg font-extrabold tracking-[-0.02em] ${inverse ? "text-white" : "text-[var(--ink)]"}`}
      aria-label="PNU Project 홈"
    >
      <span
        aria-hidden="true"
        className={`grid size-9 place-items-center rounded-lg border text-sm font-black ${inverse ? "border-white/30 bg-white/10" : "border-[var(--ink)]/10 bg-[var(--ink)] text-white"}`}
      >
        P
      </span>
      <span>PNU Project</span>
    </Link>
  );
}
