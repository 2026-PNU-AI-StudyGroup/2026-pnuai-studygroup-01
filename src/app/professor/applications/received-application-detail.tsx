import { DecisionButtons } from "@/app/professor/applications/decision-buttons";
import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

const statusPresentation = {
  PENDING: ["검토 중", "info"],
  ACCEPTED: ["수락", "success"],
  REJECTED: ["거절", "danger"],
} as const;

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeStyle: "short",
});

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
              {dateTime.format(application.createdAt)} 지원
            </time>
          </div>
          <p className="muted mt-6 text-sm font-bold">지원 주제</p>
          <h2
            id="application-topic-title"
            className="mt-2 text-3xl font-black tracking-[-0.04em]"
          >
            {application.topicTitle}
          </h2>
        </div>
        {application.status === "PENDING" ? (
          <DecisionButtons applicationId={application.id} />
        ) : null}
      </div>

      <section aria-labelledby="student-profile-title">
        <h3 id="student-profile-title" className="text-lg font-extrabold">
          {application.applicationKind === "TEAM" ? "지원 팀" : "지원자 정보"}
        </h3>
        <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {application.teamMembers.map((member) => (
            <li key={member.studentId} className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center">
              <strong>{member.name}</strong>
              <span className="muted break-all text-sm">{member.email}</span>
              <StatusBadge tone={member.role === "LEADER" ? "info" : "neutral"}>{member.role === "LEADER" ? "대표 지원자" : "팀원"}</StatusBadge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="application-answer-title">
        <h3 id="application-answer-title" className="text-lg font-extrabold">
          지원서 답변
        </h3>
        {application.answers.length ? (
          <ol className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {application.answers.map((answer, index) => (
              <li key={answer.questionId} className="py-6">
                <p className="text-sm font-extrabold"><span className="mr-2 text-[var(--primary)]">{index + 1}.</span>{answer.label}</p>
                <TranslatedText text={answer.value} className="mt-3 max-w-3xl whitespace-pre-wrap text-base leading-8 text-[var(--ink)]" />
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-5 space-y-7 border-y border-[var(--line)] py-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              <div><dt className="muted text-xs font-bold">희망 역할</dt><dd className="mt-2">{application.desiredRole || "미입력"}</dd></div>
              <div><dt className="muted text-xs font-bold">활동 가능 시간</dt><dd className="mt-2">{application.availability || "미입력"}</dd></div>
              <div><dt className="muted text-xs font-bold">보유 기술</dt><dd className="mt-2">{application.skills.join(", ") || "미입력"}</dd></div>
            </dl>
            <TranslatedText text={application.message} className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-[var(--ink)]" />
          </div>
        )}
      </section>
    </article>
  );
}
