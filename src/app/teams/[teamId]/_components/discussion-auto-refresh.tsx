"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ponytail: 단순 폴링. 새로고침 없이 새 메시지 반영. 서버 부하 크면 SSE/웹소켓으로 승격.
export function DiscussionAutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, router]);
  return null;
}
