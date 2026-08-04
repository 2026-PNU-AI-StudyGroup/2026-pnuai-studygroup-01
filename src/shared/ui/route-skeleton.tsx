// 라우트 세그먼트 로딩 폴백(loading.tsx)에서 쓰는 시각 스켈레톤.
// 텍스트가 없어 i18n 프로바이더/카탈로그에 의존하지 않으며, DB가 무거운
// 서버 컴포넌트 렌더 동안 얼어붙은 화면 대신 즉시 진행감을 준다.
export function RouteSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4">
      <div className="h-8 w-56 max-w-full rounded bg-[var(--surface-subtle)]" />
      <div className="h-4 w-80 max-w-full rounded bg-[var(--surface-subtle)]" />
      <div className="mt-2 h-40 rounded-[var(--radius-panel)] bg-[var(--surface-subtle)]" />
      <div className="h-40 rounded-[var(--radius-panel)] bg-[var(--surface-subtle)]" />
    </div>
  );
}
