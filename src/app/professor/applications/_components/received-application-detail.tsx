import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ApplicationDecisionForm } from "@/app/professor/applications/_components/decision-form";
import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";

const statusPresentation = {
  PENDING: ["검토 중", "info"],
  ACCEPTED: ["수락", "success"],
  REJECTED: ["거절", "danger"],
} as const;

export function ReceivedApplicationDetail({
  application,
}: {
  application: ProfessorTopicApplicationSummary;
}) {
  return (
    <article aria-labelledby="application-topic-title" className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--line)] pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={statusPresentation[application.status][1]}>
              {statusPresentation[application.status][0]}
            </StatusBadge>
            <time className="muted text-sm" dateTime={application.createdAt.toISOString()}>
              <UiDate value={application.createdAt} mode="dateTime" /> <UiText>{"지원"}</UiText></time>
          </div>
          <p className="muted mt-6 text-sm font-medium"><UiText>{"지원 주제"}</UiText></p>
          <h2
            id="application-topic-title"
            className="mt-2 text-2xl font-semibold tracking-[-0.035em]"
          >
            <UiText>{application.topicTitle}</UiText>
          </h2>
        </div>
      </div>

      <section aria-labelledby="student-profile-title">
        <h3 id="student-profile-title" className="text-lg font-semibold">
          <UiText>{application.applicationKind === "TEAM" ? "지원 팀" : "지원자 정보"}</UiText>
        </h3>
        <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {application.teamMembers.map((member) => (
            <li key={member.studentId} className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center">
              <strong>{member.name}</strong>
              <span className="muted break-all text-sm">{member.email}</span>
              <StatusBadge tone={member.role === "LEADER" ? "info" : "neutral"}><UiText>{member.role === "LEADER" ? "대표 지원자" : "팀원"}</UiText></StatusBadge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="application-answer-title">
        <h3 id="application-answer-title" className="text-lg font-semibold">
          <UiText>{"지원서 답변"}</UiText></h3>
        {application.answers.length ? (
          <ol className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {application.answers.map((answer, index) => (
              <li key={answer.questionId} className="py-6">
                <p className="text-sm font-semibold">
                  <span className="mr-2 text-[var(--primary)]">{index + 1}.</span>
                  <UiText>{answer.label}</UiText>
                </p>
                <TranslatedText text={answer.value} className="mt-3 max-w-3xl whitespace-pre-wrap text-base leading-8 text-[var(--ink)]" />
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-5 space-y-7 border-y border-[var(--line)] py-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              <ApplicationProfileItem label="희망 역할" value={application.desiredRole} />
              <ApplicationProfileItem label="활동 가능 시간" value={application.availability} />
              <ApplicationProfileItem label="보유 기술" value={application.skills.join(", ")} />
            </dl>
            <TranslatedText text={application.message} className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-[var(--ink)]" />
          </div>
        )}
      </section>

      {application.status === "PENDING" ? (
        <section aria-labelledby="review-decision-title" className="border-y border-[var(--line)] py-6">
          <div className="mb-5 border-b border-[var(--line)] pb-4">
            <h3 id="review-decision-title" className="text-lg font-semibold"><UiText>{"결정과 의견 전달"}</UiText></h3>
            <p className="muted mt-2 text-sm leading-6"><UiText>{"수락 근거나 보완점을 남기면 결정 결과와 함께 학생에게 전달됩니다."}</UiText></p>
          </div>
          <ApplicationDecisionForm applicationId={application.id} />
        </section>
      ) : null}

      {application.status !== "PENDING" ? (
        <section aria-labelledby="review-result-title" className="border-l-2 border-[var(--primary)] bg-[var(--primary-subtle)] px-5 py-5">
          <h3 id="review-result-title" className="text-sm font-semibold"><UiText>{"전달한 검토 의견"}</UiText></h3>
          <p className="mt-2 whitespace-pre-wrap leading-7"><UiText>{application.reviewComment || "별도 의견 없이 결정했습니다."}</UiText></p>
        </section>
      ) : null}
    </article>
  );
}

function ApplicationProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted text-xs font-semibold"><UiText>{label}</UiText></dt>
      <dd className="mt-2"><UiText>{value || "미입력"}</UiText></dd>
    </div>
  );
}
