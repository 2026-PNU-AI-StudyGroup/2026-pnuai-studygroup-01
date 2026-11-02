import Link from "next/link";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";

import { RecruitmentDecisionForm } from "@/app/recruitments/_components/recruitment-decision-form";
import { StudentTeamIcon } from "@/modules/student-team/ui/student-team-section-layout";
import type { StudentTeamRecruitmentPostApplications } from "@/modules/student-team/application/manage-student-team-recruitment";
import { cardClass, CardHead, ObjectHeader, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { EmptyState } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";

const statusPresentation: Record<StudentTeamRecruitmentPostApplications["applications"][number]["status"], { label: string; tone: PillTone }> = {
  PENDING: { label: "검토 중", tone: "accent" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "plain" },
  CLOSED: { label: "모집 종료", tone: "plain" },
  WITHDRAWN: { label: "철회", tone: "plain" },
};

// 지원자, 지원 내용, 처리. 목록 폭이 44rem 아래면 한 줄씩 쌓인다.
const rowGrid = "@min-[44rem]:grid-cols-[10rem_minmax(0,1fr)_auto]";

/** 공고 하나의 지원자. 지원자 목록이 가장 크고, 공고 본문은 옆 칸에 둔다. */
export function RecruitmentApplicationsView({
  post,
  actorRole,
}: {
  post: StudentTeamRecruitmentPostApplications;
  actorRole: "STUDENT" | "ADMIN";
}) {
  const pendingCount = post.applications.filter((application) => application.status === "PENDING").length;
  const open = post.status === "OPEN";
  const finding = !post.applications.length ? undefined : open && pendingCount ? (
    <><b className="font-semibold"><UiText>{`지원자 ${post.applications.length}명 중 ${pendingCount}명이 검토를 기다립니다.`}</UiText></b>{" "}<UiText>{"정원이 차면 모집은 자동 종료됩니다."}</UiText></>
  ) : open ? (
    <UiText>{`지원자 ${post.applications.length}명을 모두 처리했습니다.`}</UiText>
  ) : (
    <UiText>{`모집이 끝난 공고입니다. 지원자 ${post.applications.length}명의 처리 결과만 남아 있습니다.`}</UiText>
  );

  return (
    <div className="grid gap-3.5">
      <ObjectHeader
        id="recruitment-post-title"
        title={<UiText>{post.title}</UiText>}
        titleAside={<Pill tone={open ? "accent" : "plain"}>{open ? "모집 중" : "모집 종료"}</Pill>}
        meta={<UiText>{post.teamName}</UiText>}
        finding={finding}
        actions={(
          // 넓은 화면은 위 막대 경로가 같은 일을 해서 휴대폰에서만 둔다.
          <Link className="button-secondary button-compact gap-1.5 lg:hidden" href={actorRole === "STUDENT" ? "/recruitments/received" : "/dashboard"}>
            <StudentTeamIcon name="chevron-left" className="size-4" />
            <UiText>{"목록"}</UiText>
          </Link>
        )}
      />

      <div className="@container">
        <div className="grid items-start gap-3.5 @min-[60rem]:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="applicant-list-title" className={`${cardClass} @container`}>
            <CardHead id="applicant-list-title" title={<UiText>{"지원자"}</UiText>} count={<>{post.applications.length}<UiText>{"명"}</UiText></>} />
            {post.applications.length === 0 ? (
              <div className="border-t border-[var(--line)] px-5">
                <EmptyState variant="compact" title="아직 지원자가 없습니다" description="새 지원자가 생기면 이 목록에 표시됩니다." />
              </div>
            ) : (
              <UiUl aria-label="지원자 목록">
                {post.applications.map((application) => {
                  const status = statusPresentation[application.status];
                  return (
                    <li key={application.id} className={`grid gap-x-5 gap-y-2.5 border-t border-[var(--line)] px-5 py-3.5 @min-[44rem]:items-start ${rowGrid}`}>
                      <div className="min-w-0 leading-5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-[var(--ink)]">{application.studentName}</h3>
                          <Pill tone={status.tone}>{status.label}</Pill>
                        </div>
                        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]"><UiDate value={application.createdAt} mode="date" />{" "}<UiText>{"지원"}</UiText></p>
                      </div>
                      <div className="min-w-0 text-[0.8125rem] leading-5">
                        <p className="text-[var(--ink)]"><span className="text-[var(--muted)]"><UiText>{"희망 역할"}</UiText></span>{" "}<span className="font-medium"><UiText>{application.desiredRole}</UiText></span></p>
                        <TranslatedText text={application.message} className="mt-1 whitespace-pre-line text-[var(--ink)]" />
                      </div>
                      {application.status === "PENDING" && open ? (
                        <div className="flex items-start gap-1.5 @min-[44rem]:justify-end">
                          <RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="ACCEPT" />
                          <RecruitmentDecisionForm applicationId={application.id} postId={post.id} decision="REJECT" />
                        </div>
                      ) : <span className="hidden @min-[44rem]:block" />}
                    </li>
                  );
                })}
              </UiUl>
            )}
          </section>

          <section aria-labelledby="recruitment-content-title" className={cardClass}>
            <CardHead id="recruitment-content-title" title={<UiText>{"모집 내용"}</UiText>} />
            <TranslatedText text={post.content} className="whitespace-pre-line px-5 pb-4 text-[0.8125rem] leading-6 text-[var(--ink)]" />
          </section>
        </div>
      </div>
    </div>
  );
}
