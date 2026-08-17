import Link from "next/link";

import { acknowledgePrivacyNoticeAction } from "@/app/onboarding/_actions/acknowledge-privacy-notice-action";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { PRIVACY_POLICY_EFFECTIVE_DATE } from "@/shared/content/privacy-policy";

const SUMMARY = [
  "부산대학교 Google 계정의 이름·이메일로 구성원 여부를 확인합니다.",
  "학과·학번·연락처는 선택 입력이며, 같은 팀 구성원과 운영진에게 공개됩니다.",
  "완료된 프로젝트의 결과물과 참여자 성명은 탈퇴 후에도 서비스에 남습니다.",
  "연락처와 로그인 정보는 탈퇴 시 삭제합니다.",
];

export function PrivacyNoticeStep() {
  return (
    <section aria-labelledby="privacy-notice-title" className="page-enter">
      <h2 id="privacy-notice-title" className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">
        <UiText>{"개인정보 처리 안내"}</UiText>
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        <UiText>
          {"교육과정 운영에 필요한 범위에서 개인정보를 처리합니다. 아래 내용을 확인한 뒤 서비스를 이용해 주세요."}
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
      <form action={acknowledgePrivacyNoticeAction} className="mt-6">
        <button type="submit" className="button-primary">
          <UiText>{"확인했습니다"}</UiText>
        </button>
      </form>
    </section>
  );
}
