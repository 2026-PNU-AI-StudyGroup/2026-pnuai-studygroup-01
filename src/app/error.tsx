"use client";

import Link from "next/link";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { Brand } from "@/shared/ui/brand";
import { RefreshIcon } from "@/shared/ui/workspace-icons";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--workspace)] px-6 py-12">
      <section className="w-full max-w-xl border-y border-[var(--line)] py-12 text-center">
        <div className="flex justify-center"><Brand /></div>
        <p className="eyebrow mt-10"><UiText>{"오류 안내"}</UiText></p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight"><UiText>{"화면을 불러오지 못했습니다"}</UiText></h1>
        <p className="muted mx-auto mt-4 max-w-md leading-7"><UiText>{"잠시 후 다시 시도해 주세요."}</UiText></p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="button-primary gap-2"><RefreshIcon className="size-4 shrink-0" /><UiText>{"다시 시도"}</UiText></button>
          <Link href="/dashboard" className="button-secondary"><UiText>{"프로젝트로 이동"}</UiText></Link>
        </div>
      </section>
    </main>
  );
}
