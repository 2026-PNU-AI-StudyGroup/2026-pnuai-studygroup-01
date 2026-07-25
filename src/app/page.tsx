import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectJourneyVisual } from "@/shared/ui/project-journey-visual";
import { PublicHeader } from "@/shared/ui/public-header";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.75]">
      <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home() {
  if (await getCurrentActor()) redirect("/topics");

  return (
    <main className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <PublicHeader>
        <Link href="/sign-in" className="button-primary min-h-11">
          로그인
        </Link>
      </PublicHeader>

      <section className="grid min-h-[calc(100vh-4.75rem)] w-full gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(22rem,.76fr)_minmax(34rem,1.24fr)] lg:items-center lg:gap-16 lg:px-[clamp(3rem,7vw,8rem)]">
        <div className="page-enter max-w-[42rem]">
          <p className="text-sm font-bold text-[var(--primary)]">부산대학교 학과 프로젝트</p>
          <h1 className="mt-5 text-[clamp(3.1rem,7vw,6.4rem)] font-black leading-[.92] tracking-[-0.075em]">
            프로젝트는
            <br />
            이어져야 합니다.
          </h1>
          <p className="mt-7 max-w-[34rem] text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            주제를 발견하는 순간부터 팀의 과정과 결과가 남는 순간까지, 하나의 흐름으로 연결합니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/sign-in" className="button-primary min-h-13 gap-3 px-6 text-base">
              프로젝트 시작
              <ArrowIcon />
            </Link>
            <a href="#project-flow" className="button-secondary min-h-13 px-6 text-base">
              흐름 보기
            </a>
          </div>
        </div>

        <div id="project-flow">
          <ProjectJourneyVisual />
        </div>
      </section>
    </main>
  );
}
