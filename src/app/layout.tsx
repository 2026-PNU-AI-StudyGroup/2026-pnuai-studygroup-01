import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "PNU 프로젝트 관리 시스템",
  description: "부산대학교 졸업과제 프로젝트 관리 시스템",
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
