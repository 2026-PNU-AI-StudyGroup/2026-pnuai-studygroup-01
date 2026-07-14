import Link from "next/link";

import { Brand } from "@/shared/ui/brand";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f5f2]">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6" aria-label="랜딩 메뉴">
        <Brand />
        <Link href="/sign-in" className="button-secondary">로그인</Link>
      </nav>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-12 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Pusan National University</p>
          <h1 aria-label="학과 프로젝트 관리 시스템" className="mt-5 text-4xl font-black leading-[1.15] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl">
            학과 프로젝트의 모든 흐름을,<br />한곳에서 선명하게.
          </h1>
          <p className="muted mt-7 max-w-xl text-lg leading-8">
            주제 탐색과 팀 구성부터 진행 기록, 보고서 승인, 결과물 보관까지. 학생과 교수의 협업 과정을 단순하게 연결합니다.
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
              ["01", "프로그램 탐색", "열린 프로젝트와 대회의 주제를 비교하고 지원합니다."],
              ["02", "팀 구성", "교수 승인으로 팀이 확정됩니다."],
              ["03", "진행 관리", "마일스톤과 위험 요소를 함께 기록합니다."],
              ["04", "제출과 승인", "보고서와 결과물을 웹에서 검토합니다."],
            ].map(([number, title, description]) => (
              <li key={number} className="grid grid-cols-[3rem_1fr] gap-4 py-6">
                <span className="font-mono text-sm text-[var(--teal)]">{number}</span>
                <div><h2 className="text-lg font-bold">{title}</h2><p className="muted mt-1 text-sm leading-6">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
