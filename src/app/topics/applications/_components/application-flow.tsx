import type { ApplicationFlowModel } from "@/app/topics/applications/_lib/application-flow-model";

export function ApplicationFlow({ model, total }: { model: ApplicationFlowModel; total: number }) {
  return (
    <section aria-labelledby="application-flow-title" className="border-y border-[var(--line)]">
      <div className="grid gap-5 py-5 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(0,2.1fr)] lg:items-center lg:gap-8">
        <div className="lg:border-r lg:border-[var(--line)] lg:pr-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow text-[var(--primary-hover)]">{model.currentStage.eyebrow}</p>
            <p className="text-sm font-semibold text-[var(--muted)]">접수 {total}건</p>
          </div>
          <h2 id="application-flow-title" className="mt-1 text-xl font-black tracking-[-0.025em]">{model.currentStage.title}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">{model.currentStage.description}</p>
        </div>

        <div>
          <p className="sr-only">전체 지원 과정</p>
          <ol className="grid gap-4 sm:grid-cols-3 sm:gap-0">
            {model.steps.map((step, index) => (
              <ApplicationFlowStep
                key={step.label}
                index={index}
                label={step.label}
                copy={step.copy}
                isCurrent={model.currentStage.step === index}
                isComplete={model.currentStage.step > index || (index === 2 && model.decidedCount > 0)}
                isLast={index === model.steps.length - 1}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function ApplicationFlowStep({ index, label, copy, isCurrent, isComplete, isLast }: {
  index: number;
  label: string;
  copy: string;
  isCurrent: boolean;
  isComplete: boolean;
  isLast: boolean;
}) {
  const markerClassName = isCurrent
    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
    : isComplete
      ? "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--ink)]"
      : "border-[var(--line)] bg-white text-[var(--muted)]";

  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:pr-5">
      {!isLast ? <span aria-hidden="true" className="absolute bottom-[-1rem] left-4 top-8 w-px bg-[var(--line)] sm:bottom-auto sm:left-8 sm:right-0 sm:top-4 sm:h-px sm:w-auto" /> : null}
      <div className="relative">
        <span className={`relative z-10 inline-flex size-8 items-center justify-center rounded-full border text-sm font-black ${markerClassName}`}>{index + 1}</span>
      </div>
      <div className="pb-1">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold">{label}</h3>
          {isCurrent ? <span className="text-xs font-bold text-[var(--primary)]">현재</span> : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{copy}</p>
      </div>
    </li>
  );
}
