import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import "./globals.css";
import { getRequestLocale } from "@/modules/translation/infrastructure/request-locale";
import { I18nProvider } from "@/modules/translation/ui/i18n-provider";
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
      template: `%s · ${applicationName}`,
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
  return (
    <html lang={locale}>
      <body>
        <DialogBackdropDismissController />
        {/*
          방향(사용자 확정): Canon — 잘 만든 SaaS 관리자 대시보드. 정석을 높은 완성도로(반어·잔재주 없이).
          OWN-WORLD: 라이트 그라운드 + 화이트 서피스 카드 + 정제된 인디고 악센트(#4f46e5) + 소프트 섀도우 + 둥근 모서리. 데이터·수치·시각 tabular-nums.
          크래프트 기준 = Linear·Vercel·Stripe 대시보드 수준. 라이트 전용(관리자 데스크톱 종일).
        */}
        <I18nProvider locale={locale}><UiText>{children}</UiText></I18nProvider>
      </body>
    </html>
  );
}
