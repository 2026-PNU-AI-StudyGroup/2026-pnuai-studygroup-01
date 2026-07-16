import Link from "next/link";

import { Brand } from "@/shared/ui/brand";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--canvas)]">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6" aria-label="랜딩 메뉴">
        <Brand />
        <Link href="/sign-in" className="button-secondary">로그인</Link>
      </nav>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-12 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Pusan National University</p>
          <h1 aria-label="학과 프로젝트 관리 시스템" className="mt-5 text-4xl font-black leading-[1.15] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl">
            학과 프로젝트의<br />모든 흐름을,<br />한곳에서 선명하게.
          </h1>
          <p className="muted mt-7 max-w-xl text-lg leading-8">
            진행 중인 주제와 지난 프로젝트 탐색부터 팀 구성, 보고서 승인, 결과물 보관까지. 학생과 교수의 협업 과정을 단순하게 연결합니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/sign-in" className="button-primary px-6">부산대학교 계정으로 시작</Link>
            <a href="#workflow" className="button-quiet">운영 흐름 보기 ↓</a>
          </div>
          <p className="muted mt-4 text-sm">@pusan.ac.kr Google Workspace 계정 전용</p>
        </div>
        <div className="relative border-y border-[var(--line)] py-3 lg:border-y-0 lg:border-l lg:py-6 lg:pl-16" aria-label="프로젝트 운영 단계">
          <ol id="workflow" className="divide-y divide-[var(--line)]">
            {[
              ["프로젝트 탐색", "진행 중인 주제는 프로그램별로 비교하고 지난 프로젝트의 결과물도 함께 찾아봅니다."],
              ["팀 구성", "구조화된 지원 정보와 교수 승인으로 팀을 확정합니다."],
              ["진행 관리", "마일스톤, 진행 기록, 지도 의견을 한 흐름에서 관리합니다."],
              ["보고서와 결과물", "착수·중간·결과 보고서와 프로젝트 결과물을 검토하고 보관합니다."],
            ].map(([title, description]) => (
              <li key={title} className="py-6">
                <div><h2 className="text-lg font-bold">{title}</h2><p className="muted mt-1 text-sm leading-6">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
