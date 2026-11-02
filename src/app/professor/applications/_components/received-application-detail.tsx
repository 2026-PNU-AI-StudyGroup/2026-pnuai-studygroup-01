import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ApplicationDecisionForm } from "@/app/professor/applications/_components/decision-form";
import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { topicApplicationStatusPresentation } from "@/modules/topic-application/ui/topic-application-status-presentation";
import { cardClass, CardHead, ObjectHeader, Pill } from "@/modules/project-program/ui/work-screen";
import { TranslatedText } from "@/app/_components/translated-text";

const statusTone = { PENDING: "accent", ACCEPTED: "success", REJECTED: "danger", WITHDRAWN: "plain" } as const;

/**
 * 지원서 한 장. 왼쪽은 판단 근거(답변, 지원자), 오른쪽은 결정 칸.
 * 결정 칸 위에 선정하면 팀이 몇 명이 되는지를 먼저 적어 결정의 결과를 보고 누르게 한다.
 */
export function ReceivedApplicationDetail({
  application,
}: {
  application: ProfessorTopicApplicationSummary;
}) {
  const team = application.applicationKind === "TEAM";
  const impact = application.decisionImpact;
  const afterCount = impact ? impact.currentMemberCount + impact.acceptedMemberCount : 0;
  const finding = application.status === "PENDING" && impact ? (
    <>
      <b className="font-semibold"><UiText>{`선정하면 팀이 ${afterCount} / ${impact.capacity}명이 됩니다.`}</UiText></b>
      {impact.automaticallyRejectedApplicationCount ? <>{" "}<UiText>{`다른 검토 중 지원 ${impact.automaticallyRejectedApplicationCount}건은 자동 미선정됩니다.`}</UiText></> : null}
      {impact.closesRecruitment ? <>{" "}<UiText>{"정원이 충족되어 모집 글도 마감됩니다."}</UiText></> : null}
    </>
  ) : undefined;

  return (
    <article aria-labelledby="application-title" className="@container grid gap-3.5">
      <ObjectHeader
        id="application-title"
        title={<>{application.studentName}<UiText>{team && application.teamMembers.length > 1 ? ` 외 ${application.teamMembers.length - 1}명` : ""}</UiText></>}
        titleAside={<Pill tone={statusTone[application.status]}>{topicApplicationStatusPresentation[application.status].label}</Pill>}
        meta={(
          <>
            <Link href={`/professor/topics/${application.topicId}`} className="text-[var(--ink)] hover:text-[var(--primary)]"><UiText>{application.topicTitle}</UiText></Link>
            , <UiText>{team ? "팀 지원" : "개인 지원"}</UiText>
            , <time className="tabular-nums" dateTime={application.createdAt.toISOString()}><UiDate value={application.createdAt} mode="dateTime" /></time> <UiText>{"지원"}</UiText>
          </>
        )}
        finding={finding}
        actions={<Link href="/professor/applications" className="button-secondary button-compact"><UiText>{"목록으로"}</UiText></Link>}
      />

      <div className="grid items-start gap-3.5 @min-[60rem]:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-3.5">
          <section aria-labelledby="application-answer-title" className={cardClass}>
            <CardHead id="application-answer-title" title={<UiText>{"지원서 답변"}</UiText>} count={application.answers.length ? <UiText>{`${application.answers.length}개 문항`}</UiText> : undefined} />
            {application.answers.length ? (
              <ol className="px-5 pb-2">
                {application.answers.map((answer, index) => (
                  <li key={answer.questionId} className="py-3.5 [&+li]:border-t [&+li]:border-[var(--line)]">
                    <p className="text-[0.8125rem] font-medium text-[var(--muted)]">
                      <span className="mr-1.5 tabular-nums">{index + 1}.</span>
                      <UiText>{answer.label}</UiText>
                    </p>
                    {answer.value.trim()
                      ? <TranslatedText text={answer.value} className="mt-1.5 max-w-3xl whitespace-pre-wrap text-[0.9375rem] leading-7 text-[var(--ink)]" />
                      : <p className="mt-1.5 text-[0.9375rem] text-[var(--muted)]"><UiText>{"미입력"}</UiText></p>}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="grid gap-4 px-5 pb-5">
                <dl className="grid gap-x-6 gap-y-3 text-[0.8125rem] sm:grid-cols-3">
                  <ApplicationProfileItem label="희망 역할" value={application.desiredRole} />
                  <ApplicationProfileItem label="활동 가능 시간" value={application.availability} />
                  <ApplicationProfileItem label="보유 기술" value={application.skills.join(", ")} />
                </dl>
                <TranslatedText text={application.message} className="max-w-3xl whitespace-pre-wrap border-t border-[var(--line)] pt-4 text-[0.9375rem] leading-7 text-[var(--ink)]" />
              </div>
            )}
          </section>

          <section aria-labelledby="student-profile-title" className={cardClass}>
            <CardHead id="student-profile-title" title={<UiText>{team ? "지원 팀" : "지원자 정보"}</UiText>} count={<>{application.teamMembers.length}<UiText>{"명"}</UiText></>} />
            <ul>
              {application.teamMembers.map((member) => (
                <li key={member.studentId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-[var(--line)] px-5 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                  <strong className="truncate text-sm font-medium text-[var(--ink)]">{member.name}</strong>
                  <span className="order-3 col-span-2 truncate text-xs text-[var(--muted)] sm:order-none sm:col-span-1 sm:text-[0.8125rem]">{member.email}</span>
                  <Pill tone={member.role === "LEADER" ? "accent" : "plain"}>{member.role === "LEADER" ? "대표 지원자" : "팀원"}</Pill>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {application.status === "PENDING" ? (
          <section aria-labelledby="review-decision-title" className={`${cardClass} @min-[60rem]:sticky @min-[60rem]:top-6`}>
            <CardHead id="review-decision-title" title={<UiText>{"결정과 의견 전달"}</UiText>} />
            {impact ? (
              <>
                <dl className="mx-5 grid grid-cols-3 border-y border-[var(--line)] text-[0.8125rem]">
                  <div className="py-2.5 pr-3">
                    <dt className="text-xs text-[var(--muted)]"><UiText>{"선정 인원"}</UiText></dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--ink)]">{impact.acceptedMemberCount}<UiText>{"명"}</UiText></dd>
                  </div>
                  <div className="border-l border-[var(--line)] px-3 py-2.5">
                    <dt className="text-xs text-[var(--muted)]"><UiText>{"선정 후 인원"}</UiText></dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--ink)]">{afterCount} / {impact.capacity}<UiText>{"명"}</UiText></dd>
                  </div>
                  <div className="border-l border-[var(--line)] py-2.5 pl-3">
                    <dt className="text-xs text-[var(--muted)]"><UiText>{"자동 미선정"}</UiText></dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--ink)]">{impact.automaticallyRejectedApplicationCount}<UiText>{"건"}</UiText></dd>
                  </div>
                </dl>
                <div className="px-5 pb-5 pt-4">
                  <ApplicationDecisionForm applicationId={application.id} impact={impact} />
                </div>
              </>
            ) : <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"지금은 이 지원을 결정할 수 없습니다."}</UiText></p>}
          </section>
        ) : (
          <section aria-labelledby="review-result-title" className={cardClass}>
            <CardHead id="review-result-title" title={<UiText>{"전달한 검토 의견"}</UiText>} />
            <div className="px-5 pb-5">
              <p className={`whitespace-pre-wrap text-sm leading-6 ${application.reviewComment ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}><UiText>{application.reviewComment || "별도 의견 없이 결정했습니다."}</UiText></p>
              {application.decidedAt ? <p className="mt-3 text-xs tabular-nums text-[var(--muted)]"><UiText>{application.decidedByName ?? "시스템"}</UiText>, <UiDate value={application.decidedAt} mode="dateTime" /></p> : null}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function ApplicationProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]"><UiText>{label}</UiText></dt>
      <dd className={`mt-0.5 ${value ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}><UiText>{value || "미입력"}</UiText></dd>
    </div>
  );
}
