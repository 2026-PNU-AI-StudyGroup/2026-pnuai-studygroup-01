import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import "./globals.css";
import { getRequestLocale } from "@/modules/translation/infrastructure/request-locale";
import { I18nProvider } from "@/modules/translation/ui/i18n-provider";
import { SIDEBAR_COOKIE, normalizeSidebarState } from "@/shared/ui/appearance";
import { DialogBackdropDismissController } from "@/shared/ui/dialog-backdrop-dismiss";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  // 북마크와 탭에 뜨는 이름이다. 길면 "부산대학교 학과 프로젝트 관리 ..." 로 잘려
  // 무슨 사이트인지 알아보기 어렵다. 짧은 서비스 이름을 쓴다.
  const applicationName = "PNU AIPMS";
  return {
    applicationName,
    title: {
      default: applicationName,
      template: `%s - ${applicationName}`,
    },
    description: locale === "ko"
      ? "학과 프로젝트의 모집, 수행, 보고서 및 결과물을 관리합니다."
      : "Connect PNU project ideas, teams, process, and outcomes in one workspace.",
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const cookieStore = await cookies();
  // 서버가 첫 화면부터 맞는 사이드바 모습으로 그린다. 브라우저에서 고쳐 넣으면
  // 한 프레임 동안 반대 모습이 보이고, 그 깜빡임이 사이드바 폭까지 흔든다.
  const sidebar = normalizeSidebarState(cookieStore.get(SIDEBAR_COOKIE)?.value);
  return (
    <html
      lang={locale}
      data-sidebar={sidebar}
      suppressHydrationWarning
    >
      <body>
        <DialogBackdropDismissController />
        {/*
          방향(사용자 확정): Canon — 잘 만든 SaaS 관리자 대시보드. 정석을 높은 완성도로(반어·잔재주 없이).
          OWN-WORLD: 화이트 서피스 카드 + 정제된 인디고 악센트 + 소프트 섀도우 + 둥근 모서리. 데이터·수치·시각 tabular-nums.
          크래프트 기준 = Linear·Vercel·Stripe 대시보드 수준. 밝은 화면만 쓴다(globals.css 참고).
        */}
        <I18nProvider locale={locale}><UiText>{children}</UiText></I18nProvider>
      </body>
    </html>
  );
}
