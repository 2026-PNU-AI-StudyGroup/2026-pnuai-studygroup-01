"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cardClass } from "@/modules/project-program/ui/work-screen";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function AdvisorAccessClient({ token }: { token: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/advisor-token/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setFailed(true);
          return;
        }
        // 초대는 프로그램 하나를 가리킨다. 어디로 불려 왔는지 알고 들어왔으니 그 프로그램
        // 화면으로 곧장 데려간다. 프로그램을 못 받으면 담당 프로젝트 목록으로 떨어뜨린다.
        const body = await response.json().catch(() => null) as { programId?: string } | null;
        if (cancelled) return;
        router.replace(body?.programId ? `/topics?programId=${encodeURIComponent(body.programId)}` : "/advisor");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  // 링크 하나로 들어오는 화면이라 메뉴 없이 가운데 카드 한 장에 지금 상태만 적는다.
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--workspace)] px-4">
      <section aria-labelledby="advisor-access-title" className={`${cardClass} w-full max-w-sm px-6 py-5`}>
        <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"AIPMS 자문위원"}</UiText></p>
        <h1 id="advisor-access-title" className="mt-1 text-lg font-semibold leading-6 text-[var(--ink)]">
          <UiText>{failed ? "초대 링크를 열 수 없습니다" : "자문위원 확인 중입니다."}</UiText>
        </h1>
        <p role={failed ? "alert" : "status"} className="mt-1.5 text-sm text-[var(--muted)]">
          <UiText>{failed ? "초대 링크가 만료되었거나 회수되었습니다. 관리자에게 재발급을 요청해 주세요." : "확인이 끝나면 초대받은 프로그램 화면으로 이동합니다."}</UiText>
        </p>
        {failed ? <Link href="/" className="button-secondary button-compact mt-4"><UiText>{"첫 화면으로"}</UiText></Link> : null}
      </section>
    </main>
  );
}
