import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import "./globals.css";
import { getRequestLocale } from "@/modules/translation/infrastructure/request-locale";
import { I18nProvider } from "@/modules/translation/ui/i18n-provider";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const applicationName = locale === "ko"
    ? "부산대학교 학과 프로젝트 관리"
    : "PNU Department Project Management";
  return {
    applicationName,
    title: {
      default: applicationName,
      template: `%s · ${applicationName}`,
    },
    description: locale === "ko"
      ? "부산대학교의 아이디어와 팀, 과정과 결과를 하나의 프로젝트 경험으로 연결합니다."
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
        <I18nProvider locale={locale}><UiText>{children}</UiText></I18nProvider>
      </body>
    </html>
  );
}
