import { RecruitmentApplyForm } from "@/app/recruitments/_components/recruitment-apply-form";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import type { RecruitmentPostListResult } from "@/modules/recruitment/application/manage-recruitment";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

const historyStatus = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

function DetailIcon({ name }: { name: "skills" | "role" | "time" | "people" }) {
  const paths = {
    skills: <><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    role: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20c0-4.2 2.2-6.5 6.5-6.5s6.5 2.3 6.5 6.5" /></>,
    time: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    people: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 20c0-4 1.9-6.2 5.5-6.2s5.5 2.2 5.5 6.2M16 6c2.7 0 4 1.7 4 3.5s-1.2 3.1-3 3.3M17 14.7c2.7.4 4 2.1 4 5.3" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-current stroke-[1.8]">{paths[name]}</svg>;
}

export function RecruitmentPostList({
  actorId,
  data,
  profile,
}: {
  actorId: string;
  data: RecruitmentPostListResult;
  profile: StudentProfile | null;
}) {
  if (data.posts.length === 0) {
    return <EmptyState title="열린 모집 글이 없습니다" description="지원 가능한 모집 글이 생기면 이곳에 표시됩니다." />;
  }

  return (
    <ol className="space-y-5">
      {data.posts.map((post) => (
        <li key={post.id}>
          <article className="recruitment-card overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
            <div className="grid gap-7 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_13.5rem] lg:px-7 lg:py-7">
              <div className="min-w-0">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <strong className="rounded-md bg-[var(--primary-subtle)] px-3 py-1.5 text-[var(--primary-hover)]">{post.teamName}</strong>
                    <span className="font-medium text-[var(--muted)]">{post.topicTitle}</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">모집자 {post.authorName}</span>
                </header>
                <div className="mt-6">
                  <h3 className="text-[1.75rem] font-black leading-snug tracking-[-0.04em] text-[var(--ink)]">{post.title}</h3>
                  <TranslatedText text={post.content} className="muted mt-3 max-w-3xl leading-7" />
                </div>
                <dl className="mt-6 grid gap-5 border-t border-[var(--line)] pt-5 text-sm sm:grid-cols-3">
                  <div className="min-w-0 sm:border-r sm:border-[var(--line)] sm:pr-5"><dt className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><DetailIcon name="skills" />필요 기술</dt><dd className="mt-2 font-bold leading-6 text-[var(--ink)]">{post.requiredSkills.join(", ")}</dd></div>
                  <div className="min-w-0 sm:border-r sm:border-[var(--line)] sm:pr-5"><dt className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><DetailIcon name="role" />맡을 역할</dt><dd className="mt-2 font-bold leading-6 text-[var(--ink)]">{post.roleNeeded}</dd></div>
                  <div className="min-w-0"><dt className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><DetailIcon name="time" />활동 가능 시간</dt><dd className="mt-2 font-bold leading-6 text-[var(--ink)]">{post.availability}</dd></div>
                </dl>
              </div>
              <div className="flex flex-col justify-center border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                <p className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]"><DetailIcon name="people" />현재 팀원</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">{post.memberCount}<span className="muted ml-1 text-base font-semibold">/ {post.capacity}명</span></p>
                {post.authorId !== actorId && post.canApply && !post.ownApplication ? (
                  <RecruitmentApplyForm postId={post.id} postTitle={post.title} teamName={post.teamName} profile={profile} />
                ) : post.ownApplication ? (
                  <div className="mt-5"><p className="muted mb-2 text-xs font-semibold">내 지원 상태</p><StatusBadge tone={historyStatus[post.ownApplication.status].tone}>{historyStatus[post.ownApplication.status].label}</StatusBadge></div>
                ) : post.authorId === actorId ? (
                  <p className="muted mt-5 text-sm leading-6">내가 등록한 모집 글입니다.</p>
                ) : (
                  <p className="muted mt-5 text-sm leading-6">현재 지원할 수 없습니다.</p>
                )}
              </div>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
