import type { ReactNode } from "react";

import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { RecruitmentApplyForm } from "@/app/recruitments/_components/recruitment-apply-form";
import type { StudentTeamRecruitmentPostList } from "@/modules/student-team/application/manage-student-team-recruitment";
import { cardClass, CardHead, daysLabel, daysUntil, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { EmptyState } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";

type RecruitmentPost = StudentTeamRecruitmentPostList["posts"][number];

const ownApplicationView: Record<NonNullable<RecruitmentPost["ownApplication"]>["status"], { label: string; tone: PillTone }> = {
  PENDING: { label: "검토 중", tone: "accent" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "plain" },
  WITHDRAWN: { label: "철회", tone: "plain" },
};

/** 지금 지원 버튼을 누를 수 있는 공고. 내 팀 공고, 정원이 찬 공고, 이미 지원한 공고는 빠진다. */
export function isOpenToApply(post: RecruitmentPost, actorId: string) {
  return post.authorId !== actorId && post.canApply && !post.ownApplication && !post.isMember;
}

// 공고, 맡을 역할, 활동 시간, 인원, 마감, 지원. 목록 폭이 48rem 아래면 공고 밑에 두 칸씩 흐른다.
const rowGrid = "@min-[48rem]:grid-cols-[minmax(0,1fr)_11rem_9rem_4.5rem_6rem_7rem]";
// 넓은 화면에서는 머리글이 칸 이름을 맡고, 좁은 화면에서는 값 위에 작은 이름을 단다.
const cellLabel = "block text-xs text-[var(--muted)] @min-[48rem]:sr-only";

function RecruitmentRow({ post, actorId, contactOptions, now }: {
  post: RecruitmentPost;
  actorId: string;
  contactOptions: StudentProfile | null;
  now: Date;
}) {
  const days = daysUntil(post.deadlineAt, now);
  const own = post.ownApplication ? ownApplicationView[post.ownApplication.status] : null;
  return (
    <li className={`grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[var(--line)] px-5 py-3.5 @min-[48rem]:items-start @min-[48rem]:gap-y-0 ${rowGrid}`}>
      <div className="col-span-2 min-w-0 @min-[48rem]:col-span-1">
        <h3 className="text-sm font-medium leading-5 text-[var(--ink)]"><UiText>{post.title}</UiText></h3>
        <p className="mt-0.5 truncate text-[0.8125rem] leading-[1.125rem] text-[var(--muted)]"><UiText>{post.teamName}</UiText>, {post.authorName}</p>
        <TranslatedText text={post.content} className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-5 text-[var(--muted)]" />
      </div>
      <div className="min-w-0 text-[0.8125rem] leading-5">
        <span className={cellLabel}><UiText>{"맡을 역할"}</UiText></span>
        <p className="break-words text-[var(--ink)]"><UiText>{post.roleNeeded}</UiText></p>
        <p className="break-words text-xs leading-[1.125rem] text-[var(--muted)]"><UiText>{post.requiredSkills.join(", ")}</UiText></p>
      </div>
      <div className="min-w-0 text-[0.8125rem] leading-5">
        <span className={cellLabel}><UiText>{"활동 가능 시간"}</UiText></span>
        <p className="break-words text-[var(--ink)]"><UiText>{post.availability}</UiText></p>
      </div>
      <div className="text-[0.8125rem] leading-5 @min-[48rem]:text-right">
        <span className={cellLabel}><UiText>{"인원"}</UiText></span>
        <p className="whitespace-nowrap tabular-nums text-[var(--ink)]">{post.memberCount} / {post.capacity}<UiText>{"명"}</UiText></p>
      </div>
      <div className="text-[0.8125rem] leading-5 tabular-nums @min-[48rem]:text-right">
        <span className={cellLabel}><UiText>{"마감"}</UiText></span>
        <p className="text-[var(--ink)]"><time dateTime={post.deadlineAt.toISOString()}><UiDate value={post.deadlineAt} mode="date" /></time></p>
        <p className={`text-xs ${days <= 3 ? "font-medium text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}><UiText>{daysLabel(days)}</UiText></p>
      </div>
      <div className="col-span-2 flex min-w-0 items-center @min-[48rem]:col-span-1 @min-[48rem]:justify-end @max-[48rem]:[&>button]:w-full">
        {isOpenToApply(post, actorId) ? (
          <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} contactOptions={contactOptions} />
        ) : own ? (
          <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]"><UiText>{"내 지원"}</UiText><Pill tone={own.tone}>{own.label}</Pill></span>
        ) : (
          <span className="text-[0.8125rem] text-[var(--muted)]"><UiText>{post.isMember ? "내 팀" : "지원 마감"}</UiText></span>
        )}
      </div>
    </li>
  );
}

/** 다른 팀이 올린 모집 공고. 카드 대신 줄 맞춘 목록 한 장에 담는다. */
export function RecruitmentPostList({
  actorId,
  data,
  contactOptions,
  now = new Date(),
  footer,
}: {
  actorId: string;
  data: StudentTeamRecruitmentPostList;
  contactOptions: StudentProfile | null;
  now?: Date;
  footer?: ReactNode;
}) {
  // 둘러보기는 다른 팀 공고만. 내 팀 공고 관리는 '내 팀 → 팀 관리'에서.
  const others = data.posts.filter((post) => post.authorId !== actorId);
  // 내 공고는 이 쪽에서만 걸러 낼 수 있다. 여러 쪽이면 전체 수를 그대로 적는다.
  // ponytail: 저장소가 내 공고를 빼고 세면 이 분기는 필요 없다.
  const count = data.totalPages > 1 ? data.total : others.length;

  return (
    <section aria-labelledby="recruitment-posts-title" className={`${cardClass} @container`}>
      <CardHead id="recruitment-posts-title" title={<UiText>{"모집 중인 공고"}</UiText>} count={<>{count}<UiText>{"건"}</UiText></>} />
      {others.length === 0 ? (
        <div className="border-t border-[var(--line)] px-5">
          <EmptyState variant="compact" title="현재 모집 중인 팀이 없습니다" description="다른 팀이 모집을 올리면 여기에서 확인하고 지원할 수 있습니다." />
        </div>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[48rem]:grid ${rowGrid}`}>
            <span><UiText>{"공고"}</UiText></span>
            <span><UiText>{"맡을 역할"}</UiText></span>
            <span><UiText>{"활동 가능 시간"}</UiText></span>
            <span className="text-right"><UiText>{"인원"}</UiText></span>
            <span className="text-right"><UiText>{"마감"}</UiText></span>
            <span />
          </div>
          <UiUl aria-label="팀원 모집 목록">
            {others.map((post) => <RecruitmentRow key={post.id} post={post} actorId={actorId} contactOptions={contactOptions} now={now} />)}
          </UiUl>
        </>
      )}
      {footer}
    </section>
  );
}
