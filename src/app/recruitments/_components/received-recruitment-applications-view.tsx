import Link from "next/link";

import { RecruitmentDecisionForm } from "@/app/recruitments/_components/recruitment-decision-form";
import { StudentTeamPageIntro } from "@/modules/student-team/ui/student-team-section-layout";
import type { ReceivedStudentTeamRecruitmentApplication, SharedRecruitmentContacts } from "@/modules/student-team/application/manage-student-team-recruitment";
import { cardClass, CardHead, daysUntil } from "@/modules/project-program/ui/work-screen";
import { EmptyState } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";

const contactLabels = { phone: "전화번호", kakao: "카카오톡", github: "GitHub", instagram: "Instagram" } as const;

/** 지원자가 고른 연락처만 한 줄씩. 주소는 바로 열 수 있게 링크로 둔다. */
function SharedContacts({ contacts }: { contacts: SharedRecruitmentContacts }) {
  const entries = (Object.keys(contactLabels) as Array<keyof typeof contactLabels>)
    .flatMap((kind) => {
      const value = contacts[kind];
      return value ? [[kind, value] as const] : [];
    });
  return (
    <div className="mt-2.5">
      <h4 className="text-xs text-[var(--muted)]"><UiText>{"공유 연락처"}</UiText></h4>
      {entries.length ? (
        <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[0.8125rem] leading-5">
          {entries.map(([kind, value]) => (
            <div key={kind} className="contents">
              <dt className="text-[var(--muted)]"><UiText>{contactLabels[kind]}</UiText></dt>
              <dd className="min-w-0 break-all text-[var(--ink)]">
                {/^https?:\/\//.test(value) ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{value}</a> : value}
              </dd>
            </div>
          ))}
        </dl>
      ) : <p className="mt-1 text-[0.8125rem] text-[var(--muted)]"><UiText>{"공유한 연락처가 없습니다"}</UiText></p>}
    </div>
  );
}

// 지원자, 지원 내용, 모집 공고, 처리. 목록 폭이 52rem 아래면 한 줄씩 쌓인다.
const rowGrid = "@min-[52rem]:grid-cols-[11rem_minmax(0,1fr)_12rem_auto]";

/** 팀장이 받은 지원. 수락이나 거절을 기다리는 지원을 줄마다 바로 처리한다. */
export function ReceivedRecruitmentApplicationsView({
  applications,
  teamId,
  now = new Date(),
}: {
  applications: ReceivedStudentTeamRecruitmentApplication[];
  teamId?: string;
  now?: Date;
}) {
  const oldest = applications.reduce<ReceivedStudentTeamRecruitmentApplication | undefined>(
    (current, application) => !current || application.createdAt < current.createdAt ? application : current,
    undefined,
  );
  const waitedDays = oldest ? -daysUntil(oldest.createdAt, now) : 0;
  const finding = oldest ? (
    <>
      <b className="font-semibold"><UiText>{`검토를 기다리는 지원자 ${applications.length}명`}</UiText></b>
      {", "}<UiText>{waitedDays > 0 ? `${oldest.studentName} 님이 ${waitedDays}일째 가장 오래 기다리고 있습니다.` : `${oldest.studentName} 님이 오늘 지원했습니다.`}</UiText>
    </>
  ) : undefined;
  const scopeName = teamId ? applications[0]?.teamName : undefined;

  return (
    <div className="grid gap-3.5">
      <StudentTeamPageIntro
        title="받은 지원"
        finding={finding}
        action={teamId ? <Link className="button-secondary button-compact" href="/recruitments/received"><UiText>{"전체 팀 보기"}</UiText></Link> : undefined}
      />

      <section aria-labelledby="received-applications-title" className={`${cardClass} @container`}>
        <CardHead
          id="received-applications-title"
          title={<UiText>{scopeName ? `${scopeName} 검토 대기` : "검토 대기"}</UiText>}
          count={<>{applications.length}<UiText>{"명"}</UiText></>}
        />
        {applications.length === 0 ? (
          <div className="border-t border-[var(--line)] px-5">
            <EmptyState
              variant="compact"
              title={teamId ? "이 팀에는 검토할 지원자가 없습니다" : "검토할 지원자가 없습니다"}
              description={teamId ? "새 지원이 도착하면 이곳에서 바로 검토할 수 있습니다." : "팀장인 모집 공고에 새 지원이 도착하면 이곳에 표시됩니다."}
              action={<Link className="button-secondary button-compact" href={teamId ? `/teams/manage/${teamId}` : "/teams"}><UiText>{teamId ? "팀 관리" : "내 팀"}</UiText></Link>}
            />
          </div>
        ) : (
          <>
            <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[52rem]:grid ${rowGrid}`}>
              <span><UiText>{"지원자"}</UiText></span>
              <span><UiText>{"지원 내용"}</UiText></span>
              <span><UiText>{"모집 공고"}</UiText></span>
              <span className="w-[8.5rem]" />
            </div>
            <UiUl aria-label="검토 대기 지원 목록">
              {applications.map((application) => (
                <li id={`application-${application.id}`} key={application.id} className={`grid gap-x-5 gap-y-3 border-t border-[var(--line)] px-5 py-3.5 @min-[52rem]:items-start ${rowGrid}`}>
                  <div className="min-w-0 leading-5">
                    <h3 className="text-sm font-semibold text-[var(--ink)]">{application.studentName}</h3>
                    <p className="text-[0.8125rem] text-[var(--ink)]"><UiText>{application.desiredRole}</UiText></p>
                    <p className="text-xs tabular-nums text-[var(--muted)]"><UiDate value={application.createdAt} mode="date" />{" "}<UiText>{"지원"}</UiText></p>
                  </div>
                  <div className="min-w-0">
                    <TranslatedText text={application.message} className="whitespace-pre-line text-[0.8125rem] leading-5 text-[var(--ink)]" />
                    <SharedContacts contacts={application.sharedContacts} />
                  </div>
                  <div className="min-w-0 text-[0.8125rem] leading-5">
                    <p className="text-[var(--ink)]"><UiText>{application.teamName}</UiText></p>
                    <p className="break-words text-[var(--muted)]"><UiText>{application.postTitle}</UiText></p>
                    <p className="text-xs tabular-nums text-[var(--muted)]"><UiText>{"현재 팀 구성"}</UiText>{" "}{application.memberCount} / {application.capacity}<UiText>{"명"}</UiText></p>
                  </div>
                  <div className="flex items-start gap-1.5 @min-[52rem]:w-[8.5rem] @min-[52rem]:justify-end">
                    <RecruitmentDecisionForm applicationId={application.id} postId={application.postId} decision="ACCEPT" />
                    <RecruitmentDecisionForm applicationId={application.id} postId={application.postId} decision="REJECT" />
                  </div>
                </li>
              ))}
            </UiUl>
          </>
        )}
      </section>
    </div>
  );
}
