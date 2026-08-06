"use client";

import Link from "next/link";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useEffect } from "react";

export default function TeamWorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" aria-labelledby="workspace-error-title" className="border-y border-[var(--line)] py-12">
      <p className="eyebrow text-[var(--danger)]"><UiText>{"불러오기 실패"}</UiText></p>
      <h1 id="workspace-error-title" className="mt-2 text-2xl font-bold tracking-[-0.035em]"><UiText>{"프로젝트 정보를 불러오지 못했습니다"}</UiText></h1>
      <p className="muted mt-3 max-w-xl"><UiText>{"잠시 후 다시 시도해 주세요. 문제가 계속되면 학과 관리자에게 문의해 주세요."}</UiText></p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="button-primary"><UiText>{"다시 시도"}</UiText></button>
        <Link href="/dashboard" className="button-secondary"><UiText>{"프로젝트 목록으로 이동"}</UiText></Link>
      </div>
    </section>
  );
}
