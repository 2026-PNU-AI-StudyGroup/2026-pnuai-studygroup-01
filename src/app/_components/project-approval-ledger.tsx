import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TopicApprovalDecisionForm } from "@/app/_components/topic-approval-decision-form";
import type { TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import { StatusBadge } from "@/shared/ui/page-primitives";

const status = { PENDING: ["검토 대기", "info"], APPROVED: ["승인", "success"], REJECTED: ["반려", "danger"] } as const;
const approvalLedgerColumns = "xl:grid-cols-[minmax(16rem,1.45fr)_7.5rem_8.5rem_11rem_minmax(18rem,1fr)]";

export function ProjectApprovalLedger({ requests, student }: {
  requests: TopicApprovalRequestSummary[];
  student: boolean;
}) {
  return (
    <section aria-labelledby="approval-ledger-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="approval-ledger-title" className="text-xl font-bold tracking-[-0.03em]">
            <UiText>{student ? "보낸 요청" : "승인 대기열"}</UiText>
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <UiText>{student ? "요청 경로와 검토 결과를 확인합니다." : "제안 내용과 요청 경로를 확인한 뒤 처리합니다."}</UiText>
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-[var(--muted)]">{requests.length}<UiText>{"건"}</UiText></span>
      </div>

      <div aria-hidden="true" className={`hidden border-y border-[var(--line)] px-2 py-3 text-xs font-semibold text-[var(--muted)] xl:grid xl:gap-5 ${approvalLedgerColumns}`}>
        <span><UiText>{"프로젝트"}</UiText></span>
        <span><UiText>{"상태"}</UiText></span>
        <span><UiText>{"제안자"}</UiText></span>
        <span><UiText>{"요청 경로"}</UiText></span>
        <span><UiText>{student ? "검토 의견" : "검토"}</UiText></span>
      </div>
      <UiUl aria-label="프로젝트 승인 요청 목록" className="divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white xl:border-t-0">
        {requests.map((request) => {
          const route = request.route === "PROFESSOR"
            ? `${request.requestedProfessorName ?? "지정 교수"} 교수`
            : "관리자";
          const showDecision = !student && request.status === "PENDING";
          return (
            <li key={request.id} className={`record-row grid gap-5 px-2 py-6 xl:items-start xl:gap-5 ${approvalLedgerColumns}`}>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"프로젝트"}</UiText></p>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]"><UiText>{request.topicTitle}</UiText></h3>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"상태"}</UiText></p>
                <StatusBadge tone={status[request.status][1]}>{status[request.status][0]}</StatusBadge>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"제안자"}</UiText></p>
                <p className="text-sm font-semibold">{request.requesterName}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"요청 경로"}</UiText></p>
                <p className="text-sm font-semibold">{route}</p>
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{student ? "검토 의견" : "검토"}</UiText></p>
                {showDecision ? (
                  <TopicApprovalDecisionForm requestId={request.id} />
                ) : (
                  <p className={`text-sm leading-6 ${request.reviewComment ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                    {request.reviewComment || (request.status === "PENDING" ? "검토 대기 중" : "등록된 검토 의견 없음")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </UiUl>
    </section>
  );
}
