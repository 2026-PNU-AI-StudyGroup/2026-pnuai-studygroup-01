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
          className={disabled ? "button-secondary w-full cursor-not-allowed gap-2 opacity-60" : "button-secondary w-full gap-2"}
          aria-describedby={disabled ? "google-sign-in-disabled-help" : undefined}
        >
          <GoogleMark className="size-5 shrink-0" />
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

function GoogleMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className={className}>
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </svg>
  );
}
