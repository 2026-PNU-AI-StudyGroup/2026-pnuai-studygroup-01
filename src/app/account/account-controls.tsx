"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { authClient } from "@/modules/identity/infrastructure/auth-client";

export function AccountControls() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      setMessage("");
      const { error } = await authClient.signOut();
      if (error) {
        setMessage("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div>
      <section aria-labelledby="session-heading" className="border-t border-[var(--line)] pt-6">
        <h2 id="session-heading" className="text-lg font-extrabold">로그인 세션</h2>
        <p className="muted mt-2 text-sm leading-6">공용 기기에서는 작업을 마친 뒤 반드시 로그아웃해 주세요.</p>
        <button type="button" onClick={signOut} disabled={isPending} className="button-secondary mt-5">{isPending ? "처리 중..." : "로그아웃"}</button>
      </section>
      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm font-semibold">{message}</p>
    </div>
  );
}
