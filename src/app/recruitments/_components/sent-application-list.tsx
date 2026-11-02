import Link from "next/link";
import type { ReactNode } from "react";

import type { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { cardClass, CardHead, Missing, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { EmptyState } from "@/shared/ui/page-primitives";

export type SentApplicationPage = Awaited<ReturnType<StudentTeamRecruitmentQueryService["listApplicationHistory"]>>;

// 기다리는 지원만 파랑, 수락은 초록, 끝난 것은 회색. 거절도 더 할 일이 없어 빨강을 쓰지 않는다.
const statusPresentation: Record<SentApplicationPage["applications"][number]["status"], { label: string; tone: PillTone }> = {
  PENDING: { label: "검토 중", tone: "accent" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "plain" },
  CLOSED: { label: "모집 종료", tone: "plain" },
  WITHDRAWN: { label: "철회", tone: "plain" },
};

// 지원한 모집, 모집 팀, 지원일, 처리일, 상태. 목록 폭이 40rem 아래면 팀과 날짜가 모집 이름 밑으로 흐른다.
const rowGrid = "@min-[40rem]:grid-cols-[minmax(0,1fr)_minmax(0,13rem)_7rem_7rem_5rem]";

/** 내가 다른 팀에 보낸 지원. 언제 냈고 언제 처리됐는지를 날짜 칸으로 맞춘다. */
export function SentApplicationList({ data, footer }: { data: SentApplicationPage; footer?: ReactNode }) {
  return (
    <section aria-labelledby="sent-applications-title" className={`${cardClass} @container`}>
      <CardHead id="sent-applications-title" title={<UiText>{"보낸 지원"}</UiText>} count={<>{data.total}<UiText>{"건"}</UiText></>} />
      {data.applications.length === 0 ? (
        <div className="border-t border-[var(--line)] px-5">
          <EmptyState variant="compact" title="아직 지원 내역이 없습니다" description="모집 중인 팀을 확인하고 함께할 팀에 지원해 보세요." action={<Link className="button-secondary button-compact" href="/recruitments"><UiText>{"모집 공고 둘러보기"}</UiText></Link>} />
        </div>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[40rem]:grid ${rowGrid}`}>
            <span><UiText>{"지원한 모집"}</UiText></span>
            <span><UiText>{"팀"}</UiText></span>
            <span className="text-right"><UiText>{"지원일"}</UiText></span>
            <span className="text-right"><UiText>{"처리일"}</UiText></span>
            <span><UiText>{"상태"}</UiText></span>
          </div>
          <UiUl aria-label="보낸 지원 목록">
            {data.applications.map((application) => {
              const status = statusPresentation[application.status];
              return (
                <li key={application.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-1 border-t border-[var(--line)] px-5 py-3 @min-[40rem]:items-center ${rowGrid}`}>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium leading-5 text-[var(--ink)]"><UiText>{application.postTitle}</UiText></h3>
                    <p className="mt-0.5 truncate text-[0.8125rem] leading-[1.125rem] text-[var(--muted)] @min-[40rem]:hidden"><UiText>{application.teamName}</UiText>, <UiText>{`팀장 ${application.recruiterName}`}</UiText></p>
                  </div>
                  <div className="hidden min-w-0 text-[0.8125rem] leading-[1.125rem] @min-[40rem]:block">
                    <p className="truncate text-[var(--ink)]"><UiText>{application.teamName}</UiText></p>
                    <p className="truncate text-xs text-[var(--muted)]"><UiText>{`팀장 ${application.recruiterName}`}</UiText></p>
                  </div>
                  <p className="col-start-1 row-start-2 text-xs tabular-nums text-[var(--muted)] @min-[40rem]:col-start-auto @min-[40rem]:row-start-auto @min-[40rem]:text-right @min-[40rem]:text-[0.8125rem] @min-[40rem]:text-[var(--ink)]">
                    <time dateTime={application.createdAt.toISOString()}><UiDate value={application.createdAt} mode="date" /></time>
                    <span className="@min-[40rem]:hidden">
                      {" "}<UiText>{"지원"}</UiText>
                      {application.decidedAt ? <>, <UiDate value={application.decidedAt} mode="date" />{" "}<UiText>{"처리"}</UiText></> : null}
                    </span>
                  </p>
                  <p className="hidden text-right text-[0.8125rem] tabular-nums text-[var(--ink)] @min-[40rem]:block">
                    {application.decidedAt ? <time dateTime={application.decidedAt.toISOString()}><UiDate value={application.decidedAt} mode="date" /></time> : <Missing />}
                  </p>
                  <div className="col-start-2 row-span-2 row-start-1 self-center @min-[40rem]:col-start-auto @min-[40rem]:row-span-1 @min-[40rem]:row-start-auto"><Pill tone={status.tone}>{status.label}</Pill></div>
                </li>
              );
            })}
          </UiUl>
        </>
      )}
      {footer}
    </section>
  );
}
