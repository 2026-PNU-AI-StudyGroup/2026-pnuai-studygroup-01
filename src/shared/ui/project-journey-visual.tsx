const stages = [
  ["발견", "주제"],
  ["연결", "팀"],
  ["실행", "과정"],
  ["공유", "결과"],
] as const;

export function ProjectJourneyVisual({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="주제 발견부터 결과 기록까지 이어지는 프로젝트 흐름"
      className={`relative isolate overflow-hidden rounded-[1.5rem] bg-[#172033] text-white ${compact ? "min-h-[27rem] p-6 sm:p-8" : "min-h-[34rem] p-7 sm:p-10"}`}
    >
      <div className="absolute -right-24 -top-20 size-80 rounded-full bg-[var(--primary)]/38 blur-3xl" aria-hidden="true" />
      <svg aria-hidden="true" viewBox="0 0 900 420" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[72%] w-full opacity-80">
        <path d="M-30 355C155 205 240 420 405 270S690 90 940 190" fill="none" stroke="var(--primary)" strokeWidth="78" strokeLinecap="round" />
        <path d="M-10 385C170 255 280 430 448 300S710 165 930 225" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 150C220 55 330 230 515 130S735 40 890 90" fill="none" stroke="white" strokeOpacity=".13" strokeWidth="1.5" />
        <path d="M20 180C220 80 350 260 540 150S760 60 910 110" fill="none" stroke="white" strokeOpacity=".09" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-white/55">프로젝트 흐름</p>
            <h2 className={`mt-3 max-w-[13ch] font-extrabold leading-[1.02] tracking-[-0.055em] ${compact ? "text-4xl sm:text-5xl" : "text-[clamp(2.8rem,5vw,5.2rem)]"}`}>
              하나의 맥락으로
              <br />
              끝까지.
            </h2>
          </div>
          <svg aria-hidden="true" viewBox="0 0 32 32" className="size-9 shrink-0 fill-none stroke-[var(--accent)] stroke-[2]">
            <circle cx="11" cy="16" r="6.5" />
            <circle cx="21" cy="16" r="6.5" />
            <path d="M13.5 11.2 18.5 20.8M13.5 20.8 18.5 11.2" strokeLinecap="round" />
          </svg>
        </div>

        <ol className="relative mt-auto grid grid-cols-2 gap-x-4 gap-y-7 pt-20 sm:grid-cols-4 sm:gap-4">
          {stages.map(([title, noun], index) => (
            <li key={title} className="relative min-w-0 border-t border-white/22 pt-4">
              <span
                aria-hidden="true"
                className={`absolute -top-1.5 left-0 size-3 rounded-full border-2 border-[#172033] ${index === 2 ? "bg-[var(--accent)]" : "bg-[var(--primary)]"}`}
              />
              <strong className="block text-lg font-extrabold">{title}</strong>
              <span className="mt-1 block text-xs text-white/52">{noun}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
