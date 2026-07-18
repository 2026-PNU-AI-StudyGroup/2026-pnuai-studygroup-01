import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { Brand } from "@/shared/ui/brand";

export const metadata: Metadata = { title: "로그인" };

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex h-[4.5rem] max-w-[1280px] items-center border-b border-[var(--line)] px-6"><Brand /></header>
      <section className="mx-auto grid max-w-[1280px] gap-14 px-6 py-14 lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:py-20">
        <div className="page-enter max-w-2xl"><p className="eyebrow">PNU PROJECTS</p><h1 className="mt-4 text-[clamp(2.75rem,6vw,4.75rem)] font-black leading-[1.02] tracking-[-0.055em]">학교 계정 하나로<br /><span className="text-[var(--primary)]">프로젝트에 연결</span><span className="text-[var(--accent)]">.</span></h1><p className="muted mt-6 max-w-xl text-lg leading-8">학생은 주제와 팀을 찾고, 교수는 지원과 진행을 검토하며, 관리자는 프로그램의 운영 흐름을 이어갑니다.</p></div>
        <div className="border-t-2 border-[var(--primary)] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <p className="eyebrow">계정 인증</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">로그인</h2>
          <p className="muted mt-4 leading-7">부산대학교 Google Workspace 계정으로 안전하게 인증합니다.</p>
          <div className="mt-8 border-y border-[var(--line)] py-7"><GoogleSignInButton /></div>
          <div className="mt-6 min-w-0 break-words border-l-2 border-[var(--accent)] py-1 pl-4 text-sm leading-6 text-[var(--muted)]">인증된 <strong className="text-[var(--ink)]">@pusan.ac.kr</strong> 계정만 이용할 수 있습니다. 다른 Google 계정으로는 가입되지 않습니다.</div>
          <Link href="/" className="button-quiet mt-7 px-0">← 서비스 소개로 돌아가기</Link>
        </div>
      </section>
    </main>
  );
}
