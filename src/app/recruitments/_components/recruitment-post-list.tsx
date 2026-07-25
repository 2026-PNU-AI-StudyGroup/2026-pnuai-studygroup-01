import { RecruitmentApplyForm } from "@/app/recruitments/_components/recruitment-apply-form";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import type { StudentTeamRecruitmentPostList } from "@/modules/student-team/application/manage-student-team-recruitment";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

const historyStatus = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

const posterTheme = {
  background: "bg-[#e8efff]",
  accent: "text-[#315fd8]",
  shape: "bg-[#a9c0ff]",
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
    return <EmptyState title="지금은 열린 모집이 없습니다" description="새로운 팀이 동료를 찾기 시작하면 이곳에 표시됩니다." />;
  }

  return (
    <ol className="grid gap-x-6 gap-y-8 xl:grid-cols-2">
      {data.posts.map((post) => {
        return (
          <li key={post.id}>
            <article className="group h-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white transition-colors duration-200 hover:border-[#c8d2e5]">
              <div className={`relative min-h-44 overflow-hidden ${posterTheme.background} px-6 py-6`}>
                <div aria-hidden="true" className={`absolute -right-10 -top-16 size-52 rounded-full opacity-70 ${posterTheme.shape}`} />
                <div aria-hidden="true" className="absolute bottom-0 right-16 h-28 w-px rotate-[28deg] bg-white/70" />
                <div className="relative flex h-full min-h-32 flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <p className={`text-sm font-black ${posterTheme.accent}`}>{post.teamName}</p>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
                      <CapacityIcon />
                      {post.memberCount}/{post.capacity}명
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-5">
                    <p className="max-w-[21rem] text-[1.65rem] font-black leading-[1.12] tracking-[-0.04em] text-[var(--ink)]">{post.roleNeeded}</p>
                    <div className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-white bg-[var(--ink)] text-white" aria-label={`모집자 ${post.authorName}`}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.75]" strokeLinecap="round">
                        <circle cx="12" cy="8" r="3.25" />
                        <path d="M5.5 20c.4-4.2 2.6-6.2 6.5-6.2s6.1 2 6.5 6.2" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[22rem] flex-col px-6 py-6">
                <div>
                  <p className="text-xs font-bold text-[var(--muted)]">{post.topicTitle} · {post.authorName}</p>
                  <h3 className="mt-2 text-[1.35rem] font-black leading-snug tracking-[-0.025em] text-[var(--ink)]">{post.title}</h3>
                  <TranslatedText text={post.content} className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]" />
                </div>

                <dl className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-5 gap-y-4 border-t border-[var(--line)] pt-5 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-[var(--muted)]">필요 기술</dt>
                    <dd className="mt-1 truncate font-bold text-[var(--ink)]">{post.requiredSkills.join(", ")}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-[var(--muted)]">활동 가능 시간</dt>
                    <dd className="mt-1 truncate font-bold text-[var(--ink)]">{post.availability}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex items-end justify-between gap-5 pt-6">
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                    <CapacityIcon />
                    {post.capacity - post.memberCount > 0 ? `${post.capacity - post.memberCount}자리 남음` : "팀 구성 완료"}
                  </p>
                  <div className="min-w-36">
                    {post.authorId !== actorId && post.canApply && !post.ownApplication ? (
                      <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} profile={profile} />
                    ) : post.ownApplication ? (
                      <StatusBadge tone={historyStatus[post.ownApplication.status].tone}>{historyStatus[post.ownApplication.status].label}</StatusBadge>
                    ) : post.authorId === actorId ? (
                      <span className="text-sm font-semibold text-[var(--muted)]">내 모집</span>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--muted)]">지원 마감</span>
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
