import type { AdvisorProgramBanner } from "@/modules/advisor/infrastructure/prisma-advisor-workspace-banner-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";

/**
 * 초대 링크로 들어온 자문위원에게 "여기가 어디이고 무엇을 하면 되는지"를 알리는 머리띠.
 *
 * 외부 위원은 이 시스템에 계정을 만든 적도, 둘러본 적도 없다. 링크 하나를 받아 들어와서
 * 곧장 심사한다. 그래서 이름·프로그램·기한·남은 표를 화면 맨 위에 한 번에 세워 둔다.
 */
export function AdvisorProgramBannerView({ banner, now }: { banner: AdvisorProgramBanner; now: Date }) {
  const remainingVotes = banner.voting ? Math.max(banner.voting.voteLimit - banner.voting.usedVotes, 0) : 0;
  const votingPhase = !banner.voting
    ? "NONE"
    : now < banner.voting.startsAt ? "UPCOMING" : now >= banner.voting.endsAt ? "CLOSED" : "OPEN";
  return (
    <section
      aria-labelledby="advisor-banner-title"
      className="mb-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft,none)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        <UiText>{"자문위원 심사"}</UiText>
      </p>
      <h2 id="advisor-banner-title" className="mt-1.5 text-lg font-bold leading-6 tracking-[-0.02em] [overflow-wrap:anywhere]">
        <UiText>{`${banner.advisorName} 위원님 · ${banner.programName}`}</UiText>
      </h2>
      <p className="muted mt-1 text-sm leading-6">
        <UiText>{banner.programCategory}</UiText>
        <span aria-hidden="true">{" · "}</span>
        <UiDate value={banner.programStartsAt} mode="date" />
        <span aria-hidden="true">{" ~ "}</span>
        <UiDate value={banner.programEndsAt} mode="date" />
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <BannerFact label="투표 기간">
          {banner.voting ? (
            <>
              <UiDate value={banner.voting.startsAt} mode="dateTime" />
              <span aria-hidden="true">{" ~ "}</span>
              <UiDate value={banner.voting.endsAt} mode="dateTime" />
            </>
          ) : (
            <UiText>{"투표를 열지 않는 프로그램입니다."}</UiText>
          )}
        </BannerFact>
        <BannerFact label="남은 표">
          {votingPhase === "OPEN" ? (
            <UiText>
              {banner.voting?.scope === "DIVISION"
                ? `분과마다 ${banner.voting.voteLimit}표 중 ${remainingVotes}표`
                : `${banner.voting?.voteLimit ?? 0}표 중 ${remainingVotes}표`}
            </UiText>
          ) : (
            <UiText>
              {votingPhase === "UPCOMING" ? "투표 시작 전" : votingPhase === "CLOSED" ? "투표 종료" : "해당 없음"}
            </UiText>
          )}
        </BannerFact>
        <BannerFact label="심사 대상">
          <UiText>
            {banner.divisionCount > 0
              ? `${banner.candidateCount}개 프로젝트 · ${banner.divisionCount}개 분과`
              : `${banner.candidateCount}개 프로젝트`}
          </UiText>
        </BannerFact>
      </dl>
    </section>
  );
}

function BannerFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3">
      <dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--ink)] tabular-nums">{children}</dd>
    </div>
  );
}
