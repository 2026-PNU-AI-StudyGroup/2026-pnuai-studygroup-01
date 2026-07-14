import Link from "next/link";

import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { Brand } from "@/shared/ui/brand";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
      <section className="hidden flex-col justify-between bg-[#ecebe7] p-12 lg:flex">
        <Brand />
        <blockquote className="max-w-xl">
          <p className="text-3xl font-bold leading-snug tracking-tight text-[var(--ink)]">“좋은 프로젝트는 결과뿐 아니라 과정이 선명합니다.”</p>
          <footer className="muted mt-5">부산대학교 졸업과제 프로젝트 관리</footer>
        </blockquote>
        <p className="muted text-sm">주제 · 팀 · 진행 · 보고서 · 결과물</p>
      </section>
      <section className="flex min-h-screen items-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-12 lg:hidden"><Brand /></div>
          <p className="eyebrow">Secure access</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">로그인</h1>
          <p className="muted mt-4 leading-7">부산대학교 구성원 인증을 위해 Google Workspace 로그인을 사용합니다.</p>
          <div className="mt-8 border-y border-[var(--line)] py-8">
            <GoogleSignInButton />
          </div>
          <div className="mt-6 rounded-xl bg-[#f5f5f2] p-4 text-sm leading-6 text-[var(--muted)]">
            인증된 <strong className="text-[var(--ink)]">@pusan.ac.kr</strong> 계정만 이용할 수 있습니다. 다른 Google 계정으로는 가입되지 않습니다.
          </div>
          <Link href="/" className="button-quiet mt-7 px-0">← 서비스 소개로 돌아가기</Link>
        </div>
      </section>
    </main>
  );
}
