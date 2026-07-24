"use client";

import { useEffect } from "react";

export default function TopicApplicationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="content-shell">
      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)]" aria-labelledby="application-error-title">
        <div className="bg-[var(--surface-subtle)] px-6 py-5">
          <p className="eyebrow">불러오기 오류</p>
          <h1 id="application-error-title" className="mt-2 text-2xl font-black tracking-[-0.03em]">지원 이력을 표시하지 못했습니다</h1>
        </div>
        <div className="px-6 py-8">
          <p className="max-w-xl leading-7 text-[var(--muted)]">잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 담당자에게 문의해 주세요.</p>
          <button type="button" className="button-primary mt-6" onClick={reset}>다시 불러오기</button>
        </div>
      </section>
    </main>
  );
}
