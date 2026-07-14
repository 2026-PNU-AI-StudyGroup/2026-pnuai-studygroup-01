"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-6 py-12">
      <section className="w-full max-w-xl border-y border-[var(--line)] py-12 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">화면을 불러오지 못했습니다</h1>
        <p className="muted mx-auto mt-4 max-w-md leading-7">일시적인 문제일 수 있습니다. 다시 시도해도 계속된다면 잠시 후 이용해 주세요.</p>
        <button type="button" onClick={reset} className="button-primary mt-8">다시 시도</button>
      </section>
    </main>
  );
}
