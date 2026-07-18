import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { Brand } from "@/shared/ui/brand";

export default async function Home() {
  if (await getCurrentActor()) redirect("/topics");

  const flow = [
    ["프로젝트 탐색", "진행 중인 주제를 프로그램별로 비교하고 지난 프로젝트의 결과물도 함께 찾아봅니다."],
    ["팀 구성", "구조화된 지원 정보와 교수 승인으로 팀을 확정합니다."],
    ["진행 관리", "마일스톤, 진행 기록과 지도 의견을 한 흐름에서 관리합니다."],
    ["보고서와 결과물", "착수·중간·결과 보고서와 프로젝트 결과물을 검토하고 남깁니다."],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <nav className="mx-auto flex h-[4.5rem] max-w-[1280px] items-center justify-between border-b border-[var(--line)] px-6" aria-label="랜딩 메뉴">
        <Brand />
        <div className="flex items-center gap-5"><a href="#workflow" className="hidden text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)] sm:block">서비스 흐름</a><Link href="/sign-in" className="button-primary">로그인</Link></div>
      </nav>
      <section className="portal-hero border-b border-[var(--line)]">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,.9fr)] lg:items-end lg:py-24">
          <div className="portal-hero-copy max-w-3xl">
            <p className="eyebrow">PNU Department Projects</p>
            <h1 aria-label="학과 프로젝트 관리 시스템" className="mt-4 text-[clamp(3rem,7vw,5.5rem)] font-black leading-[.98] tracking-[-0.06em] text-[var(--ink)]">찾고, 함께하고,<br /><span className="text-[var(--primary)]">끝까지 남기는</span><span aria-hidden="true" className="text-[var(--accent)]">.</span></h1>
            <p className="muted mt-7 max-w-2xl text-lg leading-8">캡스톤을 중심으로 대회와 학과 프로그램까지. 주제 탐색, 팀 구성, 진행 기록과 결과물을 하나의 흐름으로 연결합니다.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4"><Link href="/sign-in" className="button-primary px-6">부산대학교 계정으로 시작</Link><span className="muted text-sm">@pusan.ac.kr 전용</span></div>
          </div>
          <div className="border-l-2 border-[var(--primary)] pl-6 lg:mb-2 lg:pl-8"><p className="text-sm font-bold text-[var(--primary)]">지금 할 수 있는 일</p><p className="mt-3 text-2xl font-extrabold leading-snug tracking-[-0.03em]">진행 중인 주제를 비교하고,<br />지난 프로젝트의 결과를 참고하세요.</p><Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center font-bold text-[var(--primary)]">프로젝트 탐색 시작 <span aria-hidden="true" className="ml-2">→</span></Link></div>
        </div>
      </section>
      <section id="workflow" className="mx-auto max-w-[1280px] px-6 py-16 lg:py-20" aria-labelledby="workflow-title">
        <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]"><div><p className="eyebrow">하나의 운영 흐름</p><h2 id="workflow-title" className="mt-2 text-3xl font-black tracking-[-0.04em]">프로젝트의 전 과정을<br />끊김 없이</h2></div><ol className="grid border-t border-[var(--line)] sm:grid-cols-2">{flow.map(([title, description]) => <li key={title} className="border-b border-[var(--line)] py-7 sm:odd:pr-8 sm:even:border-l sm:even:pl-8"><h3 className="text-lg font-extrabold">{title}</h3><p className="muted mt-2 text-sm leading-6">{description}</p></li>)}</ol></div>
      </section>
    </main>
  );
}
