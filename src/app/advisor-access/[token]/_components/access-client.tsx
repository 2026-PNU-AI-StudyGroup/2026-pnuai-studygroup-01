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
      .then((response) => {
        if (cancelled) return;
        if (response.ok) router.replace("/advisor");
        else setFailed(true);
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
