import { DEVELOPMENT_MOCK_ACCOUNTS } from "@/modules/identity/infrastructure/development-mock-auth";

export function DevelopmentRoleSignIn({ seedRequired = false }: { seedRequired?: boolean }) {
  return (
    <section aria-labelledby="development-login-title" className="mt-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">로컬 개발 전용</p>
          <h3 id="development-login-title" className="mt-1 text-lg font-extrabold">역할별 화면 미리보기</h3>
        </div>
        <span className="rounded bg-[var(--primary-subtle)] px-2 py-1 text-xs font-bold text-[var(--primary-hover)]">LOCAL</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">역할별 화면을 데모 계정으로 바로 엽니다.</p>
      {seedRequired ? (
        <p role="alert" className="mt-3 rounded-lg bg-[var(--warning-subtle)] px-3 py-2 text-sm font-semibold text-[var(--warning-ink)]">
          데모 계정이 없습니다. 먼저 <code>ALLOW_LOCAL_DEMO_SEED=true npm run db:seed-demo</code>를 실행해 주세요.
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        {Object.entries(DEVELOPMENT_MOCK_ACCOUNTS).map(([role, account]) => (
          <form key={role} action="/api/development-auth/sign-in" method="post">
            <input type="hidden" name="role" value={role} />
            <button type="submit" className="button-secondary grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 text-left">
              <span>
                <strong className="block">{account.label}</strong>
                <span className="mt-1 block text-sm font-normal leading-5 text-[var(--muted)]">{account.description}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12m-4-4 4 4-4 4" />
              </svg>
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
