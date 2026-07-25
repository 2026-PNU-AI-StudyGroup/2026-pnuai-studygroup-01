import type { ApplicationFlowModel } from "@/app/topics/applications/_lib/application-flow-model";

export function ApplicationFlow({
  model,
  total,
}: {
  model: ApplicationFlowModel;
  total: number;
}) {
  return (
    <section aria-labelledby="application-flow-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
      <header className="flex items-baseline justify-between gap-4 px-6 py-5 sm:px-7">
        <h2 id="application-flow-title" className="text-lg font-extrabold tracking-[-0.025em]">
          지원 현황
        </h2>
        <p className="text-sm font-semibold text-[var(--muted)]">전체 {total}건</p>
      </header>
      <ol aria-label="지원 단계별 현황" className="grid border-t border-[var(--line)] sm:grid-cols-3">
        {model.steps.map((step, index) => {
          const current = model.currentStep === index;
          return (
            <li
              key={step.label}
              aria-current={current ? "step" : undefined}
              className={`relative min-h-28 border-b border-[var(--line)] px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-7 sm:last:border-r-0 ${
                current ? "text-[var(--primary)]" : ""
              }`}
            >
              {current ? <span aria-hidden="true" className="absolute inset-x-0 top-[-1px] h-0.5 bg-[var(--primary)]" /> : null}
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-extrabold">{step.label}</h3>
                <strong className="text-xl font-black tabular-nums">{step.count}</strong>
              </div>
              <p className={`mt-3 text-sm leading-6 ${current ? "text-[var(--primary-hover)]" : "text-[var(--muted)]"}`}>
                {step.detail}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
