"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <p className="text-sm font-semibold">
        <UiText>
          {failed
            ? "초대 링크가 만료되었거나 회수되었습니다. 관리자에게 재발급을 요청해 주세요."
            : "자문위원 확인 중입니다."}
        </UiText>
      </p>
    </main>
  );
}
