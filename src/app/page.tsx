import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PublicHeader } from "@/shared/ui/public-header";

const projectFlow = [
  {
    number: "01",
    title: "주제를 발견하고",
    description: "관심 분야와 진행 조건을 살펴보며 시작점을 찾습니다.",
    color: "bg-[#e8efff] text-[#315ee7]",
  },
  {
    number: "02",
    title: "동료와 연결하고",
    description: "모집과 지원을 통해 함께할 팀을 완성합니다.",
    color: "bg-[#ecf8ef] text-[#26864f]",
  },
  {
    number: "03",
    title: "과정을 쌓고",
    description: "일정과 피드백을 한곳에서 확인하며 프로젝트를 이어갑니다.",
    color: "bg-[#fff2dc] text-[#a56600]",
  },
  {
    number: "04",
    title: "결과를 남깁니다",
    description: "보고서와 결과물을 다음 프로젝트를 위한 기록으로 남깁니다.",
    color: "bg-[#f4eaff] text-[#7e4bb5]",
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5" fill="none">
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none">
      <path d="M12 3.5c.5 4.7 3.3 7.5 8 8-4.7.5-7.5 3.3-8 8-.5-4.7-3.3-7.5-8-8 4.7-.5 7.5-3.3 8-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home() {
  if (await getCurrentActor()) redirect("/topics");

  return (
    <main className="min-h-screen overflow-hidden bg-[#e8f0ff] text-[#111827]">
      <div className="pointer-events-none fixed -left-32 top-1/4 size-[30rem] rounded-full bg-[#cfe0ff] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -right-32 bottom-0 size-[34rem] rounded-full bg-[#dce7ff] blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto min-h-screen w-full max-w-[1600px] p-0 sm:p-5 lg:p-7">
        <div className="min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f7f8fb] shadow-[0_28px_90px_rgba(49,73,125,.16)] sm:rounded-[2rem]">
          <PublicHeader>
            <nav className="flex items-center gap-3" aria-label="랜딩 메뉴">
              <a href="#journey" className="hidden min-h-11 items-center px-3 text-sm font-semibold text-[#647087] transition hover:text-[#17213a] sm:inline-flex">
                프로젝트 여정
              </a>
              <Link href="/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111827] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(17,24,39,.16)] transition hover:-translate-y-0.5 hover:bg-[#315ee7]">
                로그인
              </Link>
            </nav>
          </PublicHeader>

          <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 pb-12 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[minmax(0,.86fr)_minmax(32rem,1.14fr)] lg:items-center lg:gap-16 lg:px-12 lg:pb-16 lg:pt-14">
            <div className="page-enter max-w-[42rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8dfeb] bg-white px-3.5 py-2 text-xs font-bold text-[#315ee7] shadow-[0_6px_20px_rgba(40,58,100,.06)]">
                <SparkIcon />
                부산대학교 프로젝트 허브
              </div>
              <h1 aria-label="가능성을 프로젝트로" className="mt-7 text-[clamp(3.1rem,7.4vw,6.7rem)] font-black leading-[.92] tracking-[-0.075em] text-[#101827]">
                가능성을
                <br />
                <span className="text-[#315ee7]">함께 완성하다.</span>
              </h1>
              <p className="mt-7 max-w-[37rem] text-base font-medium leading-7 text-[#667085] sm:text-lg sm:leading-8">
                흩어진 아이디어와 사람, 진행 과정과 결과를 하나의 프로젝트 경험으로 연결합니다.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/sign-in" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#315ee7] px-7 text-base font-bold text-white shadow-[0_16px_38px_rgba(49,94,231,.28)] transition hover:-translate-y-0.5 hover:bg-[#244ed0]">
                  프로젝트 시작하기
                  <ArrowIcon />
                </Link>
                <a href="#journey" className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#d9dee8] bg-white px-7 text-base font-bold text-[#27324a] transition hover:border-[#b8c5dd] hover:bg-[#f9fbff]">
                  여정 살펴보기
                </a>
              </div>
            </div>

            <div className="relative min-h-[31rem] overflow-hidden rounded-[2rem] border border-white bg-[#e8eef9] p-4 shadow-[0_24px_70px_rgba(39,61,108,.14)] sm:min-h-[36rem] sm:p-6">
              <div className="absolute -right-20 -top-24 size-80 rounded-full bg-[#6f8fff]/25 blur-3xl" aria-hidden="true" />
              <div className="relative h-full min-h-[29rem] overflow-hidden rounded-[1.5rem] bg-white shadow-[0_12px_38px_rgba(38,55,91,.1)] sm:min-h-[33rem]">
                <div className="flex items-center justify-between border-b border-[#edf0f5] px-5 py-4 sm:px-7">
                  <div>
                    <p className="text-xs font-bold text-[#8791a4]">이번 학기</p>
                    <p className="mt-1 text-lg font-extrabold tracking-[-0.02em]">프로젝트 한눈에 보기</p>
                  </div>
                  <span className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-bold text-[#315ee7]">진행 중</span>
                </div>

                <div className="grid gap-4 p-5 sm:p-7">
                  <div className="rounded-[1.35rem] bg-[#17213a] p-5 text-white sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-white/55">나의 프로젝트</p>
                        <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">아이디어에서 결과까지</h2>
                      </div>
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-[#9eb4ff]"><SparkIcon /></span>
                    </div>
                    <div className="mt-8 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-[#7ea1ff]" /></div>
                      <span className="text-xs font-bold text-white/65">68%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <article className="rounded-[1.25rem] border border-[#edf0f5] bg-[#fafbfc] p-4 sm:p-5">
                      <div className="grid size-10 place-items-center rounded-xl bg-[#e7efff] text-[#315ee7]">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none"><path d="M5 19V8l7-4 7 4v11H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="1.8" /></svg>
                      </div>
                      <p className="mt-5 text-xs font-semibold text-[#8a94a6]">새로운 시작</p>
                      <p className="mt-1 text-base font-extrabold">주제 탐색</p>
                    </article>
                    <article className="rounded-[1.25rem] border border-[#edf0f5] bg-[#fafbfc] p-4 sm:p-5">
                      <div className="grid size-10 place-items-center rounded-xl bg-[#eaf8ee] text-[#278454]">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none"><path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19c.3-3.1 2-5 5-5s4.7 1.9 5 5m.5-4c.5-.3 1-.4 1.5-.4 2.6 0 4.1 1.6 4.5 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </div>
                      <p className="mt-5 text-xs font-semibold text-[#8a94a6]">함께할 사람</p>
                      <p className="mt-1 text-base font-extrabold">팀 연결</p>
                    </article>
                  </div>

                  <div className="flex items-center gap-4 rounded-[1.25rem] border border-[#edf0f5] bg-white p-4 sm:p-5">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff1d8] text-[#a56600]">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none"><path d="M7 4v3m10-3v3M4.5 9h15M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">다음 마일스톤</p>
                      <p className="mt-1 text-sm text-[#7a8496]">팀의 다음 목표를 확인하세요</p>
                    </div>
                    <ArrowIcon />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="journey" className="mx-auto w-full max-w-[1440px] px-5 pb-14 sm:px-8 lg:px-12 lg:pb-20" aria-labelledby="journey-title">
            <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-extrabold tracking-[0.14em] text-[#315ee7]">ONE CONNECTED JOURNEY</p>
                <h2 id="journey-title" className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">프로젝트의 모든 순간</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#737d90]">발견부터 기록까지, 필요한 흐름을 끊김 없이 이어갑니다.</p>
            </div>
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {projectFlow.map((item) => (
                <li key={item.number} className="group rounded-[1.5rem] border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_32px_rgba(42,58,92,.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(42,58,92,.1)] sm:p-6">
                  <div className={`grid size-11 place-items-center rounded-[.9rem] text-xs font-black ${item.color}`}>{item.number}</div>
                  <h3 className="mt-7 text-xl font-extrabold tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#737d90]">{item.description}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
