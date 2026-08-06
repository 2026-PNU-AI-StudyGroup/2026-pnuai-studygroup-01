import { UiText } from "@/modules/translation/ui/i18n-provider";
import { RecruitmentApplyForm } from "@/app/recruitments/_components/recruitment-apply-form";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import type { StudentTeamRecruitmentPostList } from "@/modules/student-team/application/manage-student-team-recruitment";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";

const historyStatus = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

const posterTheme = {
  background: "bg-[#e8efff]",
  accent: "text-[#315fd8]",
} as const;

function CapacityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 20c0-4 1.9-6.2 5.5-6.2s5.5 2.2 5.5 6.2M16 6c2.7 0 4 1.7 4 3.5s-1.2 3.1-3 3.3M17 14.7c2.7.4 4 2.1 4 5.3" />
    </svg>
  );
}

export function RecruitmentPostList({
  actorId,
  data,
  profile,
}: {
  actorId: string;
  data: StudentTeamRecruitmentPostList;
  profile: StudentProfile | null;
}) {
  if (data.posts.length === 0) {
    return <EmptyState title="현재 모집 중인 팀이 없습니다" />;
  }

  return (
    <ol className="grid gap-x-6 gap-y-8 xl:grid-cols-2">
      {data.posts.map((post) => {
        return (
          <li key={post.id}>
            <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white transition-colors duration-200 hover:border-[#c8d2e5]">
              <div className={`border-b border-[var(--line)] ${posterTheme.background} px-5 py-4 sm:px-6`}>
                <div className="flex items-start justify-between gap-4">
                  <p className={`text-sm font-black ${posterTheme.accent}`}>{post.teamName}</p>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
                    <CapacityIcon />
                    {post.memberCount}/{post.capacity}<UiText>{"명"}</UiText>
                  </span>
                </div>
                <p className="mt-3 text-xl font-black leading-tight tracking-[-0.03em] text-[var(--ink)]">{post.roleNeeded}</p>
              </div>

              <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{post.topicTitle}</UiText> · {post.authorName}</p>
                  <h3 className="mt-2 text-[1.35rem] font-bold leading-snug tracking-[-0.025em] text-[var(--ink)]"><UiText>{post.title}</UiText></h3>
                  <TranslatedText text={post.content} className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]" />
                  <details className="group/details mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)]">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-[var(--primary-hover)]">
                      <UiText>{"모집 내용 전체 보기"}</UiText>
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-current stroke-[1.8] transition-transform group-open/details:rotate-180"><path d="m6 8 4 4 4-4" /></svg>
                    </summary>
                    <div className="border-t border-[var(--line)] px-4 py-3">
                      <TranslatedText text={post.content} className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ink)]" />
                    </div>
                  </details>
                </div>

                <dl className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-5 gap-y-4 border-t border-[var(--line)] pt-5 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"필요 기술"}</UiText></dt>
                    <dd className="mt-1 break-words font-bold leading-6 text-[var(--ink)]"><UiText>{post.requiredSkills.join(", ")}</UiText></dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"활동 가능 시간"}</UiText></dt>
                    <dd className="mt-1 break-words font-bold leading-6 text-[var(--ink)]"><UiText>{post.availability}</UiText></dd>
                  </div>
                </dl>

                <div className="mt-auto flex items-end justify-end pt-6">
                  <div className="min-w-36">
                    {post.authorId !== actorId && post.canApply && !post.ownApplication && !post.isMember ? (
                      <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} profile={profile} />
                    ) : post.ownApplication ? (
                      <StatusBadge tone={historyStatus[post.ownApplication.status].tone}><UiText>{historyStatus[post.ownApplication.status].label}</UiText></StatusBadge>
                    ) : post.authorId === actorId ? (
                      <span className="text-sm font-semibold text-[var(--muted)]"><UiText>{"내 모집"}</UiText></span>
                    ) : post.isMember ? (
                      <span className="text-sm font-semibold text-[var(--muted)]"><UiText>{"내 팀"}</UiText></span>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--muted)]"><UiText>{"지원 마감"}</UiText></span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
