import type { ReactNode } from "react";

import { TopicApprovalDialog } from "@/app/_components/topic-approval-dialog";
import type { TopicApprovalRequestSummary, TopicApprovalStatus } from "@/modules/topic-approval/application/manage-topic-approvals";
import { cardClass, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";

// 손볼 일(검토 대기)만 파랑, 반려는 제 색, 끝난 것은 회색.
const status: Record<TopicApprovalStatus, { label: string; tone: PillTone }> = {
  PENDING: { label: "검토 대기", tone: "accent" },
  APPROVED: { label: "승인", tone: "plain" },
  REJECTED: { label: "반려", tone: "danger" },
  WITHDRAWN: { label: "철회", tone: "plain" },
  CANCELED: { label: "취소", tone: "plain" },
};

// 프로젝트, 등록자, 검토 요청 대상, 요청일, 상태, 작업. 좁으면 프로젝트 이름 아래로 흐른다.
const columns = "@min-[52rem]:grid-cols-[minmax(0,1fr)_6.5rem_8rem_6.5rem_5rem_4.5rem]";

/**
 * 관리자 승인 요청 목록. 대시보드가 쓰는 ProjectApprovalLedger 와 달리 표 한 장으로 줄을 맞춘다.
 * 상세 열기 단추는 대화상자가 그리므로 바로 아래 자식 단추만 줄 크기의 테두리 단추로 바꾼다.
 * 대기 줄마다 채운 단추가 서면 줄무늬처럼 시끄러워, 채운 단추는 화면 머리의 하나만 남긴다.
 */
export function ApprovalRequestList({ requests, total, toolbar, empty }: {
  requests: TopicApprovalRequestSummary[];
  total: number;
  toolbar: ReactNode;
  empty: { title: string; description: string };
}) {
  return (
    <section aria-labelledby="approval-ledger-title" className={`${cardClass} @container`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-5 pb-3 pt-4">
        <h2 id="approval-ledger-title" className="text-base font-semibold text-[var(--ink)]"><UiText>{"승인 요청"}</UiText></h2>
        <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{total}<UiText>{"건"}</UiText></span>
        <div className="w-full sm:ml-auto sm:w-auto">{toolbar}</div>
      </div>
      {requests.length === 0 ? (
        <div role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
          <h3 className="font-medium text-[var(--ink)]"><UiText>{empty.title}</UiText></h3>
          <p className="mt-0.5 text-[var(--muted)]"><UiText>{empty.description}</UiText></p>
        </div>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[52rem]:grid ${columns}`}>
            <span><UiText>{"프로젝트"}</UiText></span>
            <span><UiText>{"등록자"}</UiText></span>
            <span><UiText>{"검토 요청 대상"}</UiText></span>
            <span className="text-right"><UiText>{"요청일"}</UiText></span>
            <span><UiText>{"상태"}</UiText></span>
            <span />
          </div>
          <UiUl aria-label="프로젝트 승인 요청 목록">
            {requests.map((request) => {
              const route = request.route === "PROFESSOR" ? `${request.requestedProfessorName ?? "지정 교수"} 교수` : "관리자";
              const pending = request.status === "PENDING";
              return (
                <li key={request.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1.5 border-t border-[var(--line)] px-5 py-3 text-[0.8125rem] ${columns}`}>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-[var(--ink)]"><UiText>{request.topicTitle}</UiText></h3>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                      <UiText>{`${request.programName}, ${request.programCategory}`}</UiText>
                      <span className="@min-[52rem]:hidden">, <UiText>{`${request.requesterName} 등록, ${route} 검토`}</UiText></span>
                    </p>
                  </div>
                  <span className="hidden truncate text-[var(--ink)] @min-[52rem]:block">{request.requesterName}</span>
                  <span className="hidden truncate text-[var(--ink)] @min-[52rem]:block"><UiText>{route}</UiText></span>
                  <span className="hidden text-right tabular-nums text-[var(--muted)] @min-[52rem]:block"><UiDate value={request.createdAt} /></span>
                  <span className="col-start-2 row-start-1 justify-self-end @min-[52rem]:col-auto @min-[52rem]:row-auto @min-[52rem]:justify-self-start"><Pill tone={status[request.status].tone}>{status[request.status].label}</Pill></span>
                  <div className="col-span-2 flex justify-end @min-[52rem]:col-span-1 [&>button]:min-h-8 [&>button]:border-[var(--line-strong)] [&>button]:bg-[var(--surface)] [&>button]:px-3 [&>button]:py-1 [&>button]:text-[0.8125rem] [&>button]:font-medium [&>button]:text-[var(--ink)] [&>button:hover]:bg-[var(--surface-subtle)]">
                    <TopicApprovalDialog request={request} canDecide={pending} triggerLabel={pending ? "검토" : "상세"} />
                  </div>
                </li>
              );
            })}
          </UiUl>
        </>
      )}
    </section>
  );
}
