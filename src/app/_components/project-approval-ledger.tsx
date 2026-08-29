import type { ReactNode } from "react";

import { TopicApprovalDialog } from "@/app/_components/topic-approval-dialog";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { AdminSection, adminRecordListClassName, adminRecordRowClassName } from "@/app/_components/admin-section";
import type { TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import { StatusBadge } from "@/shared/ui/page-primitives";

const status = { PENDING: ["검토 대기", "info"], APPROVED: ["승인", "success"], REJECTED: ["반려", "danger"], WITHDRAWN: ["철회", "neutral"], CANCELED: ["취소", "neutral"] } as const;
const approvalLedgerColumns = "xl:grid-cols-[minmax(16rem,1.45fr)_7.5rem_8.5rem_11rem_6rem]";
const adminApprovalLedgerColumns = "2xl:grid-cols-[minmax(13rem,1.4fr)_6.5rem_7rem_8.5rem_6rem]";
const wideAdminApprovalLedgerColumns = "lg:grid-cols-[minmax(15rem,1.4fr)_7rem_7.5rem_9rem_6.5rem]";

export function ProjectApprovalLedger({ requests, student, adminSurface = false, total, title: titleOverride, toolbar, wideLayout = false, emptyState }: {
  requests: TopicApprovalRequestSummary[];
  student: boolean;
  adminSurface?: boolean;
  total?: number;
  title?: string;
  toolbar?: ReactNode;
  wideLayout?: boolean;
  emptyState?: ReactNode;
}) {
  const title = titleOverride ?? (student ? "보낸 요청" : "승인 대기");
  const description = student ? "검토 요청 대상과 결과를 확인합니다." : "등록 내용과 검토 요청 대상을 확인한 뒤 처리합니다.";
  const columns = adminSurface ? (wideLayout ? wideAdminApprovalLedgerColumns : adminApprovalLedgerColumns) : approvalLedgerColumns;
  const desktopGrid = adminSurface ? (wideLayout ? "lg:grid lg:gap-5" : "2xl:grid 2xl:gap-5") : "xl:grid xl:gap-5";
  const compactLabel = adminSurface ? (wideLayout ? "lg:hidden" : "2xl:hidden") : "xl:hidden";
  const ledger = <>
      <div aria-hidden="true" className={`hidden px-5 py-3 text-xs font-bold text-[var(--muted)] sm:px-6 ${adminSurface ? "border-b border-[var(--line)] bg-[var(--surface)]" : "border-y border-[var(--line)]"} ${desktopGrid} ${columns}`}>
        <span><UiText>{"프로젝트"}</UiText></span>
        <span><UiText>{"상태"}</UiText></span>
        <span><UiText>{"등록자"}</UiText></span>
        <span><UiText>{"검토 요청 대상"}</UiText></span>
        <span><UiText>{"상세"}</UiText></span>
      </div>
      <UiUl aria-label="프로젝트 승인 요청 목록" className={adminSurface ? adminRecordListClassName : "divide-y divide-[var(--line)] border-y border-[var(--line)] bg-[var(--surface)] xl:border-t-0"}>
        {requests.map((request) => {
          const route = request.route === "PROFESSOR"
            ? `${request.requestedProfessorName ?? "지정 교수"} 교수`
            : "관리자";
          const actionLabel = !student && request.status === "PENDING" ? "검토" : "상세";
          return (
            <li key={request.id} className={`${adminSurface ? adminRecordRowClassName : "record-row px-2 py-6"} grid gap-5 ${adminSurface ? "2xl:items-start 2xl:gap-5" : "xl:items-start xl:gap-5"} ${columns}`}>
              <div className="min-w-0">
                <p className={`mb-1 text-xs font-bold text-[var(--muted)] ${compactLabel}`}><UiText>{"프로젝트"}</UiText></p>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]"><UiText>{request.topicTitle}</UiText></h3>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]"><UiText>{request.programCategory}</UiText> · <UiText>{request.programName}</UiText></p>
              </div>
              <div>
                <p className={`mb-1.5 text-xs font-bold text-[var(--muted)] ${compactLabel}`}><UiText>{"상태"}</UiText></p>
                <StatusBadge tone={status[request.status][1]}>{status[request.status][0]}</StatusBadge>
              </div>
              <div>
                <p className={`mb-1 text-xs font-bold text-[var(--muted)] ${compactLabel}`}><UiText>{"등록자"}</UiText></p>
                <p className="text-sm font-semibold">{request.requesterName}</p>
              </div>
              <div>
                <p className={`mb-1 text-xs font-bold text-[var(--muted)] ${compactLabel}`}><UiText>{"검토 요청 대상"}</UiText></p>
                <p className="text-sm font-semibold">{route}</p>
              </div>
              <div className="min-w-0">
                <p className={`mb-2 text-xs font-bold text-[var(--muted)] ${compactLabel}`}><UiText>{"상세"}</UiText></p>
                <TopicApprovalDialog request={request} canDecide={!student && request.status === "PENDING"} triggerLabel={actionLabel} />
              </div>
            </li>
          );
        })}
      </UiUl>
    </>;

  if (adminSurface) {
    return <AdminSection id="approval-ledger-title" title={title} description={description} actions={toolbar} meta={<><strong>{total ?? requests.length}</strong><UiText>{"건"}</UiText></>}>
      {requests.length ? ledger : emptyState ?? <div className="px-5 py-10 text-center text-sm text-[var(--muted)]"><UiText>{"승인 요청이 없습니다."}</UiText></div>}
    </AdminSection>;
  }

  return (
    <section aria-labelledby="approval-ledger-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="approval-ledger-title" className="text-xl font-bold tracking-[-0.03em]"><UiText>{title}</UiText></h2>
          <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{description}</UiText></p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[var(--muted)]">{requests.length}<UiText>{"건"}</UiText></span>
      </div>
      {ledger}
    </section>
  );
}
