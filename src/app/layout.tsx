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
        {/*
          THESIS: 학과 운영을 "학사 편성표"처럼 읽히게 — 격자·시간축·행 위에 정렬된 기록. SaaS 카드 대시보드 거부.
          OWN-WORLD: 뉴트럴 페이퍼 그라운드 + 잉크 텍스트 + 단일 잉크-네이비 악센트(#1f3a68). 얇은 격자·헤어라인, near-square radius, 데이터·시간·코드·라벨은 모노스페이스+tabular-nums, 카드/소프트섀도우 대신 셀·구분선.
          STORY: 운영자(교수·관리자)가 "지금 처리할 것"을 편성표에서 한눈에 스캔·처리하고, 학생은 자기 소속 행만 명료하게 받는다.
          FIRST VIEWPORT: 좌측 라이트 아이콘 레일 + 프로그램 트리, 본문 상단 학기 편성 타임라인, 아래 처리 대기/목록이 편성표 행으로.
          FORM: grounded direction #5 (Timetable / scheduling grid), operate mode. seed df671a92.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
        */}
        <I18nProvider locale={locale}><UiText>{children}</UiText></I18nProvider>
      </body>
    </html>
  );
}
