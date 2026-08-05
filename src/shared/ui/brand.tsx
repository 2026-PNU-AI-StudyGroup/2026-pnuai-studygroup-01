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
      className={`inline-flex min-h-11 shrink-0 items-center ${isSidebar ? "w-full flex-col justify-center text-center" : ""}`}
      aria-label={ariaLabel ?? (href === "/" ? "부산대학교 학과 프로젝트 관리 홈" : "부산대학교 학과 프로젝트 탐색")}
    >
      <span
        aria-hidden="true"
        className="block h-9 w-10 shrink-0 bg-[var(--primary)] [mask-image:url('/brand/pusan-national-university.png')] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:auto_100%]"
        style={inverse ? { backgroundColor: "white" } : undefined}
      />
      {isSidebar ? (
        <span
          aria-hidden="true"
          className={`mt-1.5 block w-full whitespace-nowrap text-[0.625rem] font-bold leading-[1.35] tracking-[-0.04em] ${
            inverse ? "text-white" : "text-[var(--ink)]"
          }`}
        >
          <span className="block"><UiText>{"부산대학교"}</UiText></span>
          <span className={`block ${inverse ? "text-white/70" : "text-[var(--muted)]"}`}><UiText>{"프로젝트관리 시스템"}</UiText></span>
        </span>
      ) : null}
    </UiLink>
  );
}
