"use client";

import { useEffect } from "react";

export default function TopicApplicationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="content-shell">
      <section className="border-y border-[var(--line)] py-10" aria-labelledby="application-error-title">
        <p className="text-xs font-black text-[var(--danger)]">불러오기 오류</p>
        <h1 id="application-error-title" className="mt-2 text-3xl font-black tracking-[-0.04em]">지원 이력을 표시하지 못했습니다</h1>
        <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 담당자에게 문의해 주세요.</p>
        <button type="button" className="button-primary mt-6" onClick={reset}>다시 불러오기</button>
      </section>
    </main>
  );
}
