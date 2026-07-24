import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { PublicHeader } from "@/shared/ui/public-header";

export const metadata: Metadata = { title: "로그인" };

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ mockLogin?: string }> }) {
  const params = await searchParams;
  const showDevelopmentLogin = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen bg-[#07112f]">
      <PublicHeader />
      <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden">
        <Image src="/illustrations/platform-vision-hero.png" alt="" fill priority sizes="100vw" className="pointer-events-none -z-20 object-cover object-[72%_center] opacity-55" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07112f_0%,rgba(7,17,47,.96)_38%,rgba(7,17,47,.58)_100%)]" />
        <div className="mx-auto grid w-full max-w-[1280px] min-w-0 gap-9 px-5 py-8 sm:px-8 sm:py-12 lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-center lg:gap-16 lg:py-16">
          <div className="page-enter min-w-0 max-w-2xl text-white"><p className="text-xs font-black tracking-[0.18em] text-[#f0bd54]">PNU PROJECT COLLECTIVE</p><h1 className="mt-5 text-[clamp(2.65rem,9vw,5.5rem)] font-black leading-[.95] tracking-[-0.065em]">학교에서 시작한<br /><span className="text-[#9fb5ff]">가능성의 연결.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">학생과 교수, 아이디어와 실행, 오늘의 도전과 내일의 기록을 하나의 프로젝트 경험으로 이어갑니다.</p></div>
          <div className="min-w-0 rounded-[1.5rem] border border-white/55 bg-white/95 p-6 text-[var(--ink)] shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur-xl sm:p-8">
          <p className="eyebrow">계정 인증</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">로그인</h2>
          <p className="muted mt-4 leading-7">부산대학교 Google Workspace 계정으로 안전하게 인증합니다.</p>
          <div className="mt-8 border-y border-[var(--line)] py-7"><GoogleSignInButton /></div>
          {showDevelopmentLogin ? <DevelopmentRoleSignIn seedRequired={params?.mockLogin === "seed-required"} /> : null}
          <div className="mt-6 min-w-0 break-words border-l-2 border-[var(--accent)] py-1 pl-4 text-sm leading-6 text-[var(--muted)]">인증된 <strong className="text-[var(--ink)]">@pusan.ac.kr</strong> 계정만 이용할 수 있습니다. 다른 Google 계정으로는 가입되지 않습니다.</div>
          <Link href="/" className="button-quiet mt-7 px-0">← 서비스 소개로 돌아가기</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
