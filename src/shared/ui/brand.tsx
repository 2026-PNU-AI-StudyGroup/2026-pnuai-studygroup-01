import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-3 rounded-lg font-bold tracking-tight ${inverse ? "text-white" : "text-[var(--navy)]"}`}
      aria-label="PNU Project 홈"
    >
      <span
        aria-hidden="true"
        className={`grid size-10 place-items-center rounded-xl border text-sm font-black ${inverse ? "border-white/30 bg-white/10" : "border-[var(--navy)]/15 bg-[var(--navy)] text-white"}`}
      >
        P
      </span>
      <span>PNU Project</span>
    </Link>
  );
}
