import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "부산대학교 학과 프로젝트 관리",
  title: {
    default: "부산대학교 학과 프로젝트 관리",
    template: "%s · 부산대학교 학과 프로젝트 관리",
  },
  description: "부산대학교 학과의 프로젝트 주제, 팀, 진행 과정, 보고서와 결과물을 한곳에서 관리합니다.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
