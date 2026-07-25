"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { authClient } from "@/modules/identity/infrastructure/auth-client";

export function useSignOut() {
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

  return { signOut, isPending, message };
}
