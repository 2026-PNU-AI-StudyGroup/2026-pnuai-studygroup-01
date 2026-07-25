import type { Metadata } from "next";
import Link from "next/link";

import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { ProjectJourneyVisual } from "@/shared/ui/project-journey-visual";
import { PublicHeader } from "@/shared/ui/public-header";

export const metadata: Metadata = { title: "로그인" };

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ mockLogin?: string }> }) {
  const params = await searchParams;
  const showDevelopmentLogin = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <PublicHeader />
      <section className="grid min-h-[calc(100vh-4.75rem)] w-full gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(30rem,1.08fr)_minmax(25rem,.92fr)] lg:items-center lg:gap-16 lg:px-[clamp(3rem,7vw,8rem)] lg:py-14">
        <div className="order-2 lg:order-1">
          <ProjectJourneyVisual compact />
        </div>

        <div className="order-1 lg:order-2">
          <section aria-labelledby="sign-in-title" className="mx-auto w-full max-w-[30rem] border-t-4 border-[var(--primary)] bg-white p-6 sm:p-9">
            <p className="text-sm font-bold text-[var(--primary)]">부산대학교 계정</p>
            <h1 id="sign-in-title" className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">로그인</h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)] sm:text-base">
              부산대학교 Google Workspace 계정으로 이용할 수 있습니다.
            </p>

            <div className="mt-8 border-y border-[var(--line)] py-7">
              <GoogleSignInButton />
            </div>

            {showDevelopmentLogin ? (
              <div className="mt-6">
                <DevelopmentRoleSignIn seedRequired={params?.mockLogin === "seed-required"} />
              </div>
            ) : null}

            <div className="mt-6 flex gap-3 border-t border-[var(--line)] pt-5 text-sm leading-6 text-[var(--muted)]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 fill-none stroke-[var(--primary)] stroke-[1.75]">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <p><strong className="font-bold text-[var(--ink)]">@pusan.ac.kr</strong> 계정만 로그인할 수 있습니다.</p>
            </div>

            <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--primary)]">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]">
                <path d="M16 10H5M9 6l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              서비스 소개
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
