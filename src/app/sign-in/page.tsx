import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { PublicHeader } from "@/shared/ui/public-header";

export const metadata: Metadata = { title: "로그인" };

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none">
      <path d="m4.5 10.2 3.4 3.4 7.6-7.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ mockLogin?: string }> }) {
  const params = await searchParams;
  const showDevelopmentLogin = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen overflow-hidden bg-[#e8f0ff] text-[#111827]">
      <div className="pointer-events-none fixed -left-40 bottom-0 size-[35rem] rounded-full bg-[#d4e2ff] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -right-36 top-0 size-[32rem] rounded-full bg-[#cbdcff] blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto min-h-screen w-full max-w-[1500px] p-0 sm:p-5 lg:p-7">
        <div className="min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f8f9fc] shadow-[0_28px_90px_rgba(49,73,125,.16)] sm:rounded-[2rem]">
          <PublicHeader />
          <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-5 pb-10 pt-7 sm:px-8 sm:pb-14 sm:pt-10 lg:min-h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(26rem,.92fr)] lg:items-center lg:gap-14 lg:px-12 lg:pb-16">
            <div className="order-2 min-w-0 lg:order-1">
              <div className="relative overflow-hidden rounded-[2rem] bg-[#315ee7] p-6 text-white shadow-[0_28px_70px_rgba(49,94,231,.25)] sm:p-9 lg:min-h-[36rem] lg:p-11">
                <div className="absolute -right-24 -top-24 size-80 rounded-full border-[54px] border-white/[.07]" aria-hidden="true" />
                <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-[#7d9aff]/35 blur-2xl" aria-hidden="true" />
                <div className="relative flex h-full min-h-[27rem] flex-col justify-between lg:min-h-[30rem]">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.14em] text-white/65">부산대학교 프로젝트 경험</p>
                    <h1 className="mt-5 max-w-xl text-[clamp(2.5rem,5vw,4.8rem)] font-black leading-[.98] tracking-[-0.065em]">
                      좋은 프로젝트는
                      <br />
                      연결에서 시작됩니다.
                    </h1>
                    <p className="mt-6 max-w-lg text-base font-medium leading-7 text-white/72 sm:text-lg sm:leading-8">
                      아이디어와 동료, 과정과 결과를 한곳에서 이어가는 부산대학교의 프로젝트 경험입니다.
                    </p>
                  </div>

                  <div className="mt-12 grid gap-3 sm:grid-cols-3">
                    {[
                      ["주제", "관심 있는 도전을 발견"],
                      ["팀", "함께할 동료와 연결"],
                      ["기록", "과정과 결과를 축적"],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-[1.15rem] border border-white/15 bg-white/[.1] p-4 backdrop-blur-sm">
                        <span className="grid size-7 place-items-center rounded-full bg-white text-[#315ee7]"><CheckIcon /></span>
                        <p className="mt-5 text-sm font-extrabold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-white/62">{description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 min-w-0 lg:order-2">
              <div className="mx-auto w-full max-w-[31rem] rounded-[1.75rem] border border-[#e2e7ef] bg-white p-6 shadow-[0_20px_60px_rgba(40,57,92,.1)] sm:p-9">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#e9efff] text-[#315ee7]">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none"><path d="M12 3.5c.5 4.7 3.3 7.5 8 8-4.7.5-7.5 3.3-8 8-.5-4.7-3.3-7.5-8-8 4.7-.5 7.5-3.3 8-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                  </span>
                  <p className="text-xs font-extrabold tracking-[0.12em] text-[#315ee7]">계정 인증</p>
                </div>
                <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] sm:text-4xl">다시 만나 반가워요.</h2>
                <p className="mt-4 text-sm leading-6 text-[#6f798c] sm:text-base sm:leading-7">부산대학교 Google Workspace 계정으로 로그인하세요.</p>

                <div className="mt-8 border-y border-[#e7eaf0] py-7">
                  <GoogleSignInButton />
                </div>

                {showDevelopmentLogin ? <DevelopmentRoleSignIn seedRequired={params?.mockLogin === "seed-required"} /> : null}

                <div className="mt-6 flex gap-3 rounded-[1rem] bg-[#f5f7fb] p-4 text-sm leading-6 text-[#687286]">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#dfe8ff] text-[#315ee7]"><CheckIcon /></span>
                  <p><strong className="font-bold text-[#27324a]">@pusan.ac.kr</strong> 계정만 이용할 수 있습니다. 다른 Google 계정으로는 가입되지 않습니다.</p>
                </div>

                <Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#626d81] transition hover:text-[#315ee7]">
                  <span aria-hidden="true">←</span>
                  서비스 소개로 돌아가기
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
