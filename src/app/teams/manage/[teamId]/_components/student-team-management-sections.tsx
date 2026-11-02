import Link from "next/link";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";

import {
  CancelStudentTeamInvitationForm,
  DeleteStudentTeamForm,
  InviteStudentTeamMemberForm,
  LeaveStudentTeamForm,
  TeamMemberActions,
} from "@/app/teams/_components/student-team-controls";
import { MemberContactDialogButton } from "@/app/teams/_components/member-contact-dialog-button";
import { CloseRecruitmentPostForm } from "@/app/_components/close-recruitment-post-form";
import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";
import type { StudentTeamAuthoredRecruitmentPost } from "@/modules/student-team/application/manage-student-team-recruitment";
import { cardClass, CardHead, Missing, ObjectHeader, Pill } from "@/modules/project-program/ui/work-screen";
import { AddIcon } from "@/shared/ui/workspace-icons";

// 구성원, 역할, 합류일, 관리. 팀원에게는 관리 칸이 없다. 카드 폭이 36rem 아래면 이름 밑으로 흐른다.
const memberGrid = {
  leader: "@min-[36rem]:grid-cols-[minmax(0,1fr)_4rem_6rem_10rem]",
  member: "@min-[36rem]:grid-cols-[minmax(0,1fr)_4rem_6rem]",
} as const;
// 공고, 상태, 인원, 지원, 대기, 처리. 카드 폭이 44rem 아래면 공고 밑으로 흐른다.
const postGrid = "@min-[44rem]:grid-cols-[minmax(0,1fr)_5rem_4.5rem_3.5rem_3.5rem_11rem]";

function MembersCard({ team, isLeader }: { team: StudentTeamSummary; isLeader: boolean }) {
  const grid = memberGrid[isLeader ? "leader" : "member"];
  return (
    <section aria-labelledby="members-title" className={`${cardClass} @container`}>
      <CardHead id="members-title" title={<UiText>{"구성원"}</UiText>} count={<>{team.members.length}<UiText>{"명"}</UiText></>} />
      <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[36rem]:grid ${grid}`}>
        <span><UiText>{"이름"}</UiText></span>
        <span><UiText>{"역할"}</UiText></span>
        <span className="text-right"><UiText>{"합류일"}</UiText></span>
        {isLeader ? <span /> : null}
      </div>
      <UiUl aria-label="팀 구성원 목록">
        {team.members.map((member) => (
          <li key={member.studentId} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-1.5 border-t border-[var(--line)] px-5 py-2.5 @min-[36rem]:items-center ${grid}`}>
            <div className="min-w-0 leading-5">
              <MemberContactDialogButton name={member.name} email={member.email} contacts={member.profile} />
              <p className="truncate text-xs text-[var(--muted)]">{member.email}</p>
            </div>
            <div className="justify-self-end @min-[36rem]:justify-self-auto"><Pill tone={member.role === "LEADER" ? "accent" : "plain"}>{member.role === "LEADER" ? "팀장" : "팀원"}</Pill></div>
            <p className="text-xs tabular-nums text-[var(--muted)] @min-[36rem]:text-right @min-[36rem]:text-[0.8125rem] @min-[36rem]:text-[var(--ink)]">
              <UiDate value={member.joinedAt} mode="date" /><span className="@min-[36rem]:hidden">{" "}<UiText>{"합류"}</UiText></span>
            </p>
            {isLeader ? (
              <div className="flex justify-end">
                {member.role !== "LEADER" ? <TeamMemberActions teamId={team.id} studentId={member.studentId} studentName={member.name} /> : <Missing />}
              </div>
            ) : null}
          </li>
        ))}
      </UiUl>
    </section>
  );
}

function InviteCard({ team }: { team: StudentTeamSummary }) {
  return (
    <section aria-labelledby="invite-title" className={cardClass}>
      <CardHead id="invite-title" title={<UiText>{"팀원 초대"}</UiText>} />
      <div className="px-5 pb-4">
        <p className="mb-3 text-[0.8125rem] text-[var(--muted)]"><UiText>{"부산대학교 이메일로 초대를 보냅니다."}</UiText></p>
        <InviteStudentTeamMemberForm teamId={team.id} />
      </div>
      <div className="flex items-baseline gap-2.5 border-t border-[var(--line)] px-5 pb-1 pt-3">
        <h3 className="text-sm font-medium text-[var(--ink)]"><UiText>{"응답 대기"}</UiText></h3>
        <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{team.invitations.length}<UiText>{"건"}</UiText></span>
      </div>
      {team.invitations.length ? (
        <UiUl aria-label="응답 대기 중인 팀 초대" className="pb-1.5">
          {team.invitations.map((invite) => (
            <li key={invite.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-1.5 [&+li]:border-t [&+li]:border-[var(--line)]">
              <div className="min-w-0 leading-5">
                <p className="truncate text-[0.8125rem] text-[var(--ink)]">{invite.email}</p>
                <p className="text-xs tabular-nums text-[var(--muted)]"><UiDate value={invite.createdAt} mode="date" />{" "}<UiText>{"초대"}</UiText></p>
              </div>
              <CancelStudentTeamInvitationForm invitationId={invite.id} email={invite.email} />
            </li>
          ))}
        </UiUl>
      ) : <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"응답을 기다리는 초대가 없습니다."}</UiText></p>}
    </section>
  );
}

function RecruitmentPostsCard({ posts }: { posts: StudentTeamAuthoredRecruitmentPost[] }) {
  return (
    <section aria-labelledby="recruitment-posts-title" className={`${cardClass} @container`}>
      <CardHead id="recruitment-posts-title" title={<UiText>{"모집 공고"}</UiText>} count={<>{posts.length}<UiText>{"건"}</UiText></>} />
      {posts.length === 0 ? (
        <p className="border-t border-[var(--line)] px-5 py-3.5 text-[0.8125rem] text-[var(--muted)]"><UiText>{"등록한 모집 공고가 없습니다."}</UiText></p>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[44rem]:grid ${postGrid}`}>
            <span><UiText>{"공고"}</UiText></span>
            <span><UiText>{"상태"}</UiText></span>
            <span className="text-right"><UiText>{"인원"}</UiText></span>
            <span className="text-right"><UiText>{"지원"}</UiText></span>
            <span className="text-right"><UiText>{"대기"}</UiText></span>
            <span />
          </div>
          <UiUl aria-label="모집 공고 목록">
            {posts.map((post) => (
              <li key={post.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 border-t border-[var(--line)] px-5 py-2.5 @min-[44rem]:items-center ${postGrid}`}>
                <div className="min-w-0 leading-5">
                  <h3 className="truncate text-sm font-medium text-[var(--ink)]"><UiText>{post.title}</UiText></h3>
                  <p className="text-xs tabular-nums text-[var(--muted)]"><UiText>{"마감"}</UiText>{" "}<UiDate value={post.deadlineAt} mode="dateTime" /></p>
                </div>
                <div className="self-start @min-[44rem]:self-auto"><Pill tone={post.status === "OPEN" ? "accent" : "plain"}>{post.status === "OPEN" ? "모집 중" : "모집 종료"}</Pill></div>
                <p className="col-span-2 flex flex-wrap gap-x-3 text-[0.8125rem] tabular-nums text-[var(--muted)] @min-[44rem]:contents">
                  <span className="text-[var(--ink)] @min-[44rem]:text-right">{post.memberCount} / {post.capacity}<UiText>{"명"}</UiText></span>
                  <span className="text-[var(--ink)] @min-[44rem]:text-right"><span className="@min-[44rem]:sr-only"><UiText>{"지원"}</UiText>{" "}</span>{post.applicationCount}<UiText>{"명"}</UiText></span>
                  <span className={`@min-[44rem]:text-right ${post.pendingApplicationCount ? "font-semibold text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}><span className="font-normal @min-[44rem]:sr-only"><UiText>{"대기"}</UiText>{" "}</span>{post.pendingApplicationCount}<UiText>{"명"}</UiText></span>
                </p>
                {/* 모집 종료 버튼은 공용 폼이라 여기서 줄 높이에 맞춘다. */}
                <div className="col-span-2 flex flex-wrap items-start justify-end gap-1.5 @min-[44rem]:col-span-1 [&_form_button]:min-h-8 [&_form_button]:px-3 [&_form_button]:py-1 [&_form_button]:text-[0.8125rem] [&_form_button]:font-medium [&_form_button:hover]:bg-[var(--danger-subtle)]">
                  <Link className="button-secondary button-compact min-h-8 px-3 font-medium" href={`/recruitments/${post.id}/applications`}><UiText>{post.pendingApplicationCount ? `${post.pendingApplicationCount}명 보기` : "지원자 이력"}</UiText></Link>
                  {post.status === "OPEN" ? <CloseRecruitmentPostForm postId={post.id} /> : null}
                </div>
              </li>
            ))}
          </UiUl>
        </>
      )}
    </section>
  );
}

/** 팀 하나의 관리 화면. 머리에 팀과 모집 상태 한 줄, 그 아래 구성원이 가장 크다. */
export function StudentTeamManagementSections({
  team,
  actorId,
  recruitmentPosts,
}: {
  team: StudentTeamSummary;
  actorId: string;
  recruitmentPosts: StudentTeamAuthoredRecruitmentPost[];
}) {
  const isLeader = team.leaderId === actorId;
  const openPosts = recruitmentPosts.filter((post) => post.status === "OPEN").length;
  const finding = !isLeader ? undefined : team.pendingApplicantCount ? (
    <><b className="font-semibold"><UiText>{`검토를 기다리는 지원자 ${team.pendingApplicantCount}명`}</UiText></b>{", "}<UiText>{`모집 중인 공고 ${openPosts}건.`}</UiText></>
  ) : (
    <UiText>{openPosts ? `모집 중인 공고 ${openPosts}건, 아직 검토할 지원은 없습니다.` : "모집 중인 공고가 없습니다."}</UiText>
  );

  return (
    <div className="grid gap-3.5">
      <ObjectHeader
        id="team-title"
        title={team.name}
        titleAside={<Pill tone={isLeader ? "accent" : "plain"}>{isLeader ? "내가 팀장" : "팀원"}</Pill>}
        meta={team.description ? <UiText>{team.description}</UiText> : <UiText>{`팀장 ${team.leaderName}`}</UiText>}
        finding={finding}
        actions={isLeader ? (
          <>
            <Link className="button-secondary button-compact gap-1" href={`/recruitments/received?teamId=${team.id}`}><UiText>{"받은 지원"}</UiText>{" "}<span className="tabular-nums">{team.pendingApplicantCount}</span></Link>
            <Link className="button-primary button-compact gap-1.5" href={`/teams/manage/${team.id}?modal=recruitment`}><AddIcon className="size-4 shrink-0" /><UiText>{"팀원 모집하기"}</UiText></Link>
          </>
        ) : undefined}
      />

      <div className="@container">
        <div className="grid items-start gap-3.5 @min-[60rem]:grid-cols-[minmax(0,1fr)_21rem]">
          <MembersCard team={team} isLeader={isLeader} />
          {isLeader ? <InviteCard team={team} /> : (
            // 팀원이 이 화면에서 할 일은 탈퇴 하나라 구성원 옆에 따로 둔다.
            <section aria-labelledby="leave-title" className={`${cardClass} px-5 py-4`}>
              <h2 id="leave-title" className="text-base font-semibold text-[var(--ink)]"><UiText>{"팀 탈퇴"}</UiText></h2>
              <p className="mt-1 mb-3 text-[0.8125rem] leading-5 text-[var(--muted)]"><UiText>{"이 팀으로 낸 심사 대기 중인 지원에서 함께 빠집니다. 이미 승인된 프로젝트 팀 구성은 바뀌지 않습니다."}</UiText></p>
              <LeaveStudentTeamForm teamId={team.id} teamName={team.name} />
            </section>
          )}
        </div>
      </div>

      {isLeader ? <RecruitmentPostsCard posts={recruitmentPosts} /> : null}

      {isLeader ? (
        <section aria-labelledby="danger-title" className="mt-2 flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="danger-title" className="text-sm font-semibold text-[var(--ink)]"><UiText>{"팀 삭제"}</UiText></h2>
            <p className="mt-0.5 text-[0.8125rem] text-[var(--muted)]"><UiText>{"팀을 삭제해도 이미 결성된 프로젝트와 지난 프로젝트 기록은 유지됩니다."}</UiText></p>
          </div>
          <div className="shrink-0"><DeleteStudentTeamForm teamId={team.id} teamName={team.name} /></div>
        </section>
      ) : null}
    </div>
  );
}
