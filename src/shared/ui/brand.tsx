import { UiLink } from "@/shared/i18n/localized-elements";
import { UiText } from "@/shared/i18n/i18n-provider";

export function Brand({
  inverse = false,
  href = "/",
  ariaLabel,
  variant = "mark",
}: {
  inverse?: boolean;
  href?: string;
  ariaLabel?: string;
  variant?: "mark" | "sidebar";
}) {
  const isSidebar = variant === "sidebar";

  return (
    <UiLink
      href={href}
      className={`inline-flex min-h-11 shrink-0 items-center ${isSidebar ? "gap-2.5" : ""}`}
      aria-label={ariaLabel ?? (href === "/" ? "부산대학교 학과 프로젝트 관리 홈" : "부산대학교 학과 프로젝트 찾기")}
    >
      <span
        aria-hidden="true"
        className={`block shrink-0 bg-[var(--primary)] ${isSidebar ? "size-[1.875rem]" : "h-9 w-10"} [mask-image:url('/brand/pusan-national-university.png')] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:auto_100%]`}
        style={inverse ? { backgroundColor: "white" } : undefined}
      />
      {isSidebar ? (
        /* 왼쪽 메뉴 맨 위. 제품 이름과 소속을 한 번에 읽히게 엠블럼 오른쪽에 두 줄로 둔다. */
        <span aria-hidden="true" className="min-w-0 leading-tight">
          <span className={`block text-base font-bold tracking-[-0.01em] ${inverse ? "text-white" : "text-[var(--ink)]"}`}>AIPMS</span>
          <span className={`block whitespace-nowrap text-xs ${inverse ? "text-white/70" : "text-[var(--muted)]"}`}><UiText>{"부산대학교 AI융합교육원"}</UiText></span>
        </span>
      ) : null}
    </UiLink>
  );
}
