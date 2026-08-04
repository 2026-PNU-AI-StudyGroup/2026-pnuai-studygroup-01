import { UiText } from "@/modules/translation/ui/i18n-provider";

// 라우트 세그먼트 로딩 폴백(loading.tsx). DB가 무거운 서버 컴포넌트 렌더 동안
// 얼어붙은 화면 대신 가운데 "로딩" 표시로 진행감을 준다.
export function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-64 items-center justify-center py-20 text-sm font-semibold text-[var(--muted)]"
    >
      <UiText>{"로딩"}</UiText>
    </div>
  );
}
