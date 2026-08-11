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
          THESIS: 학과 운영을 활자 견본과 학사 평가표처럼 — 데이터를 큰 활자로 세우고, 승인은 결재(누가·언제)로 새긴다. SaaS 카드+파랑 대시보드 거부.
          OWN-WORLD: 크림 종이 그라운드 + 따뜻한 잉크 + 단일 인장-레드 악센트(#a41f13, 활성·결재·주요 상태에만). 헤어라인 괘선, near-square radius, 데이터·문서번호·시각은 모노+tabular-nums, 거대 활자 위계, 카드 대신 셀·괘선.
          STORY: 운영자가 "지금 승인·채점할 것"을 큰 활자로 한눈에 잡고 결재 흐름(담당→검토→승인, 누가·언제)이 늘 분명. 학생은 자기 행만 명료.
          FIRST VIEWPORT: 좌측 얇은 레일(부산대 마크), 본문 상단 거대 활자 지표("7건 승인 대기"), 아래 승인 큐 괘선 목록 + 결재 흐름.
          FORM: user-pinned challenger — 활자 견본 × 평가표·인장 (variable-font-specimen × registrar-record fusion), operate. seed 8271622a.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
        */}
        <I18nProvider locale={locale}><UiText>{children}</UiText></I18nProvider>
      </body>
    </html>
  );
}
