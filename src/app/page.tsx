import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PublicHeader } from "@/shared/ui/public-header";

export default async function Home() {
  if (await getCurrentActor()) redirect("/topics");

  const flow = [
    ["01", "발견", "진행 중인 주제와 지난 결과물을 탐색합니다."],
    ["02", "연결", "동료를 만나고 교수와 함께 팀을 완성합니다."],
    ["03", "몰입", "마일스톤과 피드백으로 프로젝트를 전진시킵니다."],
    ["04", "기록", "보고서와 결과물을 다음 도전으로 남깁니다."],
  ];

  return (
    <main className="min-h-screen bg-[#07112f] text-white">
      <PublicHeader>
        <nav className="flex items-center gap-5" aria-label="랜딩 메뉴">
          <a href="#workflow" className="hidden text-sm font-semibold text-white/65 hover:text-white sm:block">프로젝트 여정</a>
          <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white px-5 text-sm font-extrabold text-[#07112f] transition hover:bg-[#e8edff]">로그인</Link>
        </nav>
      </PublicHeader>
      <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden border-b border-white/10">
        <Image src="/illustrations/platform-vision-hero.png" alt="" fill priority sizes="100vw" className="pointer-events-none -z-20 object-cover object-[68%_center] opacity-90" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#07112f_0%,rgba(7,17,47,.98)_26%,rgba(7,17,47,.58)_58%,rgba(7,17,47,.12)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-gradient-to-t from-[#07112f] to-transparent" />
        <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-[1440px] flex-col justify-between px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="portal-hero-copy max-w-[48rem]">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[.07] px-4 py-2 text-xs font-extrabold tracking-[0.16em] text-[#b9c9ff] backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#e5a72d] shadow-[0_0_16px_#e5a72d]" />
              PNU PROJECT COLLECTIVE
            </div>
            <h1 aria-label="가능성을 프로젝트로" className="mt-7 text-[clamp(3.4rem,9vw,7.8rem)] font-black leading-[.88] tracking-[-0.075em]">
              가능성을<br /><span className="bg-gradient-to-r from-white via-[#cbd6ff] to-[#7fa0ff] bg-clip-text text-transparent">프로젝트로.</span>
            </h1>
            <p className="mt-8 max-w-[39rem] text-base font-medium leading-7 text-white/72 sm:text-xl sm:leading-8">아이디어가 동료를 만나고, 도전이 기록이 되는 곳. 부산대학교의 프로젝트를 발견하고 함께 완성하세요.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/sign-in" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#3867ff] px-7 text-base font-extrabold text-white shadow-[0_18px_50px_rgba(56,103,255,.38)] transition hover:-translate-y-0.5 hover:bg-[#4d76ff]">프로젝트 시작하기 <span aria-hidden="true" className="ml-3">↗</span></Link>
              <a href="#workflow" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/[.06] px-7 font-bold text-white backdrop-blur-md transition hover:bg-white/[.12]">어떻게 이어지는지 보기</a>
            </div>
          </div>
          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/10 backdrop-blur-xl sm:grid-cols-4">
            {["주제 탐색", "팀 빌딩", "진행 기록", "결과 아카이브"].map((item, index) => <div key={item} className="bg-[#0b1740]/75 px-4 py-4 sm:px-5"><span className="text-xs font-black text-[#e5a72d]">0{index + 1}</span><p className="mt-1 text-sm font-bold text-white/85">{item}</p></div>)}
          </div>
        </div>
      </section>
      <section id="workflow" className="relative overflow-hidden bg-[#f2f5ff] text-[#101a36]" aria-labelledby="workflow-title">
        <div className="absolute -right-32 top-16 size-96 rounded-full bg-[#dbe4ff] blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(17rem,.55fr)_minmax(0,1.45fr)] lg:gap-16">
            <div><p className="text-xs font-black tracking-[0.18em] text-[#2f5bea]">ONE CONNECTED JOURNEY</p><h2 id="workflow-title" className="mt-5 text-[clamp(2.5rem,5vw,4.8rem)] font-black leading-[.98] tracking-[-0.06em]">발견에서<br />기록까지.</h2><p className="mt-6 max-w-sm text-base leading-7 text-[#5c6780]">프로젝트의 순간들이 흩어지지 않도록, 모든 여정을 하나의 경험으로 연결합니다.</p></div>
            <ol className="grid gap-4 sm:grid-cols-2">{flow.map(([number, title, description], index) => <li key={title} className={`group relative min-h-56 overflow-hidden rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(20,38,92,.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(20,38,92,.14)] sm:p-7 ${index === 0 ? "border-[#315ee7] bg-[#315ee7] text-white" : "border-white bg-white/88"}`}><span className={`text-sm font-black ${index === 0 ? "text-[#ffd477]" : "text-[#315ee7]"}`}>{number}</span><h3 className="mt-14 text-2xl font-black tracking-[-0.04em]">{title}</h3><p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-white/72" : "text-[#657089]"}`}>{description}</p><span aria-hidden="true" className={`absolute right-5 top-5 text-3xl transition group-hover:translate-x-1 ${index === 0 ? "text-white/35" : "text-[#315ee7]/25"}`}>↗</span></li>)}</ol>
          </div>
        </div>
      </section>
    </main>
  );
}
