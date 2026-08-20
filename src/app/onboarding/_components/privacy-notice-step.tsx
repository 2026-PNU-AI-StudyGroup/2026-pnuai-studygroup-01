"use client";

import Link from "next/link";
import { useState } from "react";

import { acceptPrivacyConsentAction } from "@/app/onboarding/_actions/accept-privacy-consent-action";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { PRIVACY_POLICY_EFFECTIVE_DATE } from "@/shared/content/privacy-policy";

const SUMMARY = [
  "부산대학교 Google 계정의 이름·이메일로 구성원 여부를 확인합니다.",
  "학과·학번·연락처는 선택 입력이며, 같은 팀 구성원과 운영진에게 공개됩니다.",
  "완료된 프로젝트의 결과물과 참여자 성명은 탈퇴 후에도 서비스에 남습니다.",
  "연락처와 로그인 정보는 탈퇴 시 삭제합니다.",
];

export function PrivacyNoticeStep() {
  const [agreed, setAgreed] = useState(false);
  return (
    <section aria-labelledby="privacy-notice-title" className="page-enter">
      <h2 id="privacy-notice-title" className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">
        <UiText>{"개인정보 수집·이용 동의"}</UiText>
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        <UiText>
          {"교육과정 운영에 필요한 범위에서 개인정보를 처리합니다. 아래 내용에 동의해야 서비스를 이용할 수 있습니다."}
        </UiText>
      </p>
      <ul className="mt-5 grid gap-2 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 text-[0.9375rem] leading-6">
        {SUMMARY.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--muted)]">·</span>
            <UiText>{item}</UiText>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-[var(--muted)]">
        <Link href="/privacy" className="underline underline-offset-4">
          <UiText>{"개인정보 처리방침 전문 보기"}</UiText>
        </Link>
        {" · "}
        <UiText>{"시행일"}</UiText> {PRIVACY_POLICY_EFFECTIVE_DATE}
      </p>
      {/* 서비스 이용에 반드시 필요한 항목이라 선택 동의는 두지 않는다. 대신 필수임을 분명히 밝힌다. */}
      <form action={acceptPrivacyConsentAction} className="mt-6 grid gap-4">
        <label className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-4 text-[0.9375rem] leading-6">
          <UiInput
            name="privacyConsent"
            type="checkbox"
            value="on"
            required
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            <strong className="font-bold text-[var(--ink)]"><UiText>{"[필수]"}</UiText></strong>{" "}
            <UiText>{"위 내용과 개인정보 처리방침을 확인했으며, 개인정보 수집·이용에 동의합니다."}</UiText>
          </span>
        </label>
        <div>
          {/* 체크 전에는 버튼을 막는다. required 만 두면 눌러 본 뒤에야 막힌 걸 안다. */}
          <button type="submit" className="button-primary" disabled={!agreed}>
            <UiText>{"동의하고 시작하기"}</UiText>
          </button>
        </div>
      </form>
    </section>
  );
}
