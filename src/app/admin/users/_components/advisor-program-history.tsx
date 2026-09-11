"use client";

import type { AdvisorProgramHistoryRow } from "@/modules/advisor/infrastructure/prisma-advisor-invitation-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

/**
 * 자문위원 계정의 내력.
 *
 * 자문위원은 계정만 봐서는 무엇을 하는 사람인지 알 수 없다. 어느 프로그램 심사단이었고
 * 언제 거둬졌는지가 그 계정의 내용이다. 계정 상태도 초대에서 나오므로(살아 있는 초대가
 * 하나도 없으면 비활성) 이 목록을 보면 왜 그 상태인지까지 설명된다.
 *
 * 줄마다 펼쳐 두면 목록이 길어지기만 하므로 접어 두고 필요할 때만 연다.
 */
export function AdvisorProgramHistory({ name, history }: { name: string; history: AdvisorProgramHistoryRow[] }) {
  if (history.length === 0) {
    return (
      <p className="basis-full text-xs text-[var(--muted)]">
        <UiText>{"초대된 프로그램이 없습니다."}</UiText>
      </p>
    );
  }
  const serving = history.filter((row) => row.revokedAt === null).length;
  return (
    <details className="basis-full">
      <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--muted)] underline underline-offset-4">
        <UiText>{serving > 0 ? `더보기 · 참여 중 ${serving}개 / 전체 ${history.length}개` : `더보기 · 지난 프로그램 ${history.length}개`}</UiText>
      </summary>
      <ul aria-label={`${name} 자문위원 참여 프로그램`} className="mt-2 grid gap-1.5">
        {history.map((row) => (
          <li key={row.programId} className="flex flex-wrap items-center gap-2 text-xs">
            {row.revokedAt === null ? (
              <StatusBadge tone="success">{"참여 중"}</StatusBadge>
            ) : (
              <StatusBadge>{"회수됨"}</StatusBadge>
            )}
            <span className="min-w-0 font-semibold text-[var(--ink)] [overflow-wrap:anywhere]"><UiText>{row.programName}</UiText></span>
            <span className="text-[var(--muted)]">
              <UiText>{"초대"}</UiText>{" "}<UiDate value={row.invitedAt} mode="date" />
              {row.revokedAt ? (
                <>
                  <span aria-hidden="true">{" · "}</span>
                  <UiText>{"회수"}</UiText>{" "}<UiDate value={row.revokedAt} mode="date" />
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
