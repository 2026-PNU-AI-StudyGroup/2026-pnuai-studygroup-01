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
      <p className={`${className} whitespace-pre-wrap`}>{content}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {(["original", "ko", "en"] as const).map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending !== null}
            aria-pressed={view === item}
            className="text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline disabled:opacity-50 aria-pressed:font-semibold aria-pressed:text-[var(--teal-dark)]"
            onClick={() => void changeView(item)}
          >
            {item === "original" ? "원문" : item === "ko" ? "한국어" : "English"}
          </button>
        ))}
        {pending ? <span className="muted">번역 중…</span> : null}
        {error ? <span role="alert" className="text-red-700">{error}</span> : null}
      </div>
    </div>
  );
}
