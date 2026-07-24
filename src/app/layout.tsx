import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "부산대학교 학과 프로젝트 관리",
  title: {
    default: "부산대학교 학과 프로젝트 관리",
    template: "%s · 부산대학교 학과 프로젝트 관리",
  },
  description: "부산대학교의 아이디어와 팀, 과정과 결과를 하나의 프로젝트 경험으로 연결합니다.",
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
