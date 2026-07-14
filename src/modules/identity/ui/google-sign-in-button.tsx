"use client";

import { useState } from "react";

import { authClient } from "@/modules/identity/infrastructure/auth-client";

export function GoogleSignInButton() {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function signIn() {
    setErrorMessage(undefined);
    setIsPending(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (error) {
      setErrorMessage("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signIn}
        disabled={isPending}
        className="button-primary w-full"
      >
        {isPending ? "Google로 이동 중..." : "부산대학교 Google 계정으로 로그인"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
