import Link from "next/link";

export function Brand({ inverse = false, href = "/" }: { inverse?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 shrink-0 items-center gap-3 font-extrabold tracking-[-0.025em] ${inverse ? "text-white" : "text-[var(--ink)]"}`}
      aria-label={href === "/" ? "부산대학교 학과 프로젝트 관리 홈" : "부산대학교 학과 프로젝트 탐색"}
    >
      <span aria-hidden="true" className="block h-9 w-[146px] bg-[var(--primary)] [mask-image:url('/brand/pusan-national-university.png')] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain]" style={inverse ? { backgroundColor: "white" } : undefined} />
      <span aria-hidden="true" className={`hidden border-l pl-3 text-sm font-extrabold tracking-[-0.02em] sm:inline ${inverse ? "border-white/30 text-white" : "border-[var(--line)] text-[var(--ink)]"}`}>학과 프로젝트 관리</span>
    </Link>
  );
}
