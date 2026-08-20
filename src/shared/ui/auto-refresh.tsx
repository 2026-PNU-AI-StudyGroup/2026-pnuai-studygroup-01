"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 새로고침 없이 서버 데이터를 다시 읽어 온다. 화면이 보일 때만 돈다.
// ponytail: 단순 폴링. 서버 부하 크면 SSE/웹소켓으로 승격.
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
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
