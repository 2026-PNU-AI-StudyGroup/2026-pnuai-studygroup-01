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
          지원자 정보
        </h3>
        <dl className="mt-5 grid gap-x-10 gap-y-6 border-y border-[var(--line)] py-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="muted text-xs font-bold">이름</dt>
            <dd className="mt-2 font-bold">{application.studentName}</dd>
          </div>
          <div>
            <dt className="muted text-xs font-bold">부산대 이메일</dt>
            <dd className="mt-2 break-all">{application.studentEmail}</dd>
          </div>
          <div>
            <dt className="muted text-xs font-bold">희망 역할</dt>
            <dd className="mt-2">{application.desiredRole || "기존 지원서 미입력"}</dd>
          </div>
          <div>
            <dt className="muted text-xs font-bold">활동 가능 시간</dt>
            <dd className="mt-2">{application.availability || "기존 지원서 미입력"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="muted text-xs font-bold">보유 기술</dt>
            <dd className="mt-2">
              {application.skills.length ? (
                <ul className="flex flex-wrap gap-2" aria-label="보유 기술 목록">
                  {application.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded bg-[var(--surface-subtle)] px-2.5 py-1 text-sm font-semibold"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              ) : (
                "기존 지원서 미입력"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="application-message-title">
        <h3 id="application-message-title" className="text-lg font-extrabold">
          지원 동기
        </h3>
        <TranslatedText
          text={application.message}
          className="mt-5 max-w-3xl border-l-2 border-[var(--line)] pl-5 text-base leading-8 text-[var(--ink)]"
        />
      </section>
    </article>
  );
}
