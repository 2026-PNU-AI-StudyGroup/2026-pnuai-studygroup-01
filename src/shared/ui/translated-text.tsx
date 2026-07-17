"use client";

import { useState } from "react";

type View = "original" | "ko" | "en";

export function TranslatedText({ text, className = "" }: { text: string; className?: string }) {
  const [view, setView] = useState<View>("original");
  const [translations, setTranslations] = useState<Partial<Record<"ko" | "en", string>>>({});
  const [pending, setPending] = useState<"ko" | "en" | null>(null);
  const [error, setError] = useState("");

  async function changeView(next: View) {
    setError("");
    if (next === "original" || translations[next]) {
      setView(next);
      return;
    }
    setPending(next);
    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, target: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "번역하지 못했습니다.");
      setTranslations((current) => ({ ...current, [next]: body.translation }));
      setView(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "번역하지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  const content = view === "original" ? text : translations[view] ?? text;
  return (
    <div>
      <p aria-live="polite" className={`${className} whitespace-pre-wrap`}>{content}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
        {(["original", "ko", "en"] as const).map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending !== null}
            aria-pressed={view === item}
            className="snap-color inline-flex min-h-11 items-center rounded-lg px-3 text-[var(--muted)] underline-offset-4 hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] disabled:opacity-50 aria-pressed:bg-[var(--primary-subtle)] aria-pressed:font-semibold aria-pressed:text-[var(--primary-hover)]"
            onClick={() => void changeView(item)}
          >
            {item === "original" ? "원문" : item === "ko" ? "한국어" : "영어"}
          </button>
        ))}
        {pending ? <span role="status" className="muted">번역 중</span> : null}
        {error ? <span role="alert" className="text-[var(--danger)]">{error}</span> : null}
      </div>
    </div>
  );
}
