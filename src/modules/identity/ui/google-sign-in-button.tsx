"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useState } from "react";

import { authClient } from "@/modules/identity/infrastructure/auth-client";

export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  const [showDisabledHelp, setShowDisabledHelp] = useState(false);

  async function signIn() {
    if (disabled) {
      setShowDisabledHelp(true);
      return;
    }

    setErrorMessage(undefined);
    setIsPending(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/topics",
    });

    if (error) {
      setErrorMessage("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={signIn}
          onBlur={() => setShowDisabledHelp(false)}
          onFocus={() => disabled && setShowDisabledHelp(true)}
          onMouseEnter={() => disabled && setShowDisabledHelp(true)}
          onMouseLeave={() => setShowDisabledHelp(false)}
          disabled={isPending}
          aria-disabled={disabled || undefined}
          className={disabled ? "button-secondary w-full cursor-not-allowed opacity-60" : "button-primary w-full"}
          aria-describedby={disabled ? "google-sign-in-disabled-help" : undefined}
        >
          <UiText>{isPending ? "Google로 이동 중" : "부산대학교 Google 계정으로 로그인"}</UiText>
        </button>
        {disabled && showDisabledHelp ? (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-max max-w-[calc(100vw-2.5rem)] -translate-x-1/2 rounded-[var(--radius-control)] bg-[var(--ink)] px-3 py-2 text-center text-sm leading-5 text-white shadow-lg"
          >
            <UiText>{"테스트 서버에서는 테스트 계정으로 로그인하세요."}</UiText>
          </span>
        ) : null}
        {disabled ? <span id="google-sign-in-disabled-help" className="sr-only"><UiText>{"테스트 서버에서는 테스트 계정으로 로그인하세요."}</UiText></span> : null}
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          <UiText>{errorMessage}</UiText>
        </p>
      ) : null}
    </div>
  );
}
