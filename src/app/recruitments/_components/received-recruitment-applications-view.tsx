import Link from "next/link";

import { RecruitmentDecisionForm } from "@/app/recruitments/_components/recruitment-decision-form";
import { StudentTeamPageIntro } from "@/modules/student-team/ui/student-team-section-layout";
import type { ReceivedStudentTeamRecruitmentApplication } from "@/modules/student-team/application/manage-student-team-recruitment";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { MemberContacts } from "@/modules/identity/ui/member-contacts";

export function ReceivedRecruitmentApplicationsView({
  applications,
  teamId,
}: {
  applications: ReceivedStudentTeamRecruitmentApplication[];
  teamId?: string;
}) {
  return (
    <div className="space-y-5">
      <StudentTeamPageIntro
        title="받은 지원"
        description="팀장인 모집 공고의 검토 대기 지원을 처리합니다."
        meta={<span><UiText>{"검토 대기"}</UiText>{" "}{applications.length}<UiText>{"명"}</UiText></span>}
        action={teamId ? <Link className="button-secondary" href="/recruitments/received"><UiText>{"전체 팀 보기"}</UiText></Link> : undefined}
      />

      {applications.length === 0 ? (
        <EmptyState
          title={teamId ? "이 팀에는 검토할 지원자가 없습니다" : "검토할 지원자가 없습니다"}
          description={teamId ? "새 지원이 도착하면 이곳에서 바로 검토할 수 있습니다." : "팀장인 모집 공고에 새 지원이 도착하면 이곳에 표시됩니다."}
          action={<Link className="button-secondary" href={teamId ? `/teams/manage/${teamId}` : "/teams"}><UiText>{teamId ? "팀 관리" : "내 팀"}</UiText></Link>}
        />
      ) : (
        <ol className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
          {applications.map((application) => (
            <li id={`application-${application.id}`} key={application.id} className="border-b border-[var(--line)] px-6 py-6 last:border-b-0 sm:px-7">
              <article className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="info"><UiText>{"검토 대기"}</UiText></StatusBadge>
                    <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{application.teamName}</UiText>{" · "}<UiText>{application.postTitle}</UiText></span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-xl font-bold tracking-[-0.025em] text-[var(--ink)]">{application.studentName}</h2>
                    <span className="text-sm text-[var(--muted)]"><UiText>{"희망 역할"}</UiText>{" "}<strong className="font-semibold text-[var(--ink)]"><UiText>{application.desiredRole}</UiText></strong></span>
                    <span className="text-xs text-[var(--muted)]"><UiDate value={application.createdAt} mode="date" /> <UiText>{"지원"}</UiText></span>
                  </div>
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"지원 내용"}</UiText></p>
                    <TranslatedText text={application.message} className="mt-1 text-sm leading-6 text-[var(--ink)]" />
                  </div>
                  <MemberContacts phone={application.sharedContacts.phone ?? ""} kakao={application.sharedContacts.kakao ?? ""} github={application.sharedContacts.github ?? ""} instagram={application.sharedContacts.instagram ?? ""} title="공유 연락처" emptyTitle="공유한 연락처가 없습니다" />
                  <p className="mt-4 text-sm font-semibold text-[var(--muted)]"><UiText>{"현재 팀 구성"}</UiText>{" "}{application.memberCount}/{application.capacity}<UiText>{"명"}</UiText></p>
                </div>
                <div className="flex shrink-0 items-start gap-2 lg:pt-9">
                  <RecruitmentDecisionForm applicationId={application.id} postId={application.postId} decision="ACCEPT" />
                  <RecruitmentDecisionForm applicationId={application.id} postId={application.postId} decision="REJECT" />
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
