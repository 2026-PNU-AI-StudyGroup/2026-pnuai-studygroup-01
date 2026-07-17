import Link from "next/link";

import { ApplyTopicForm } from "@/app/topics/apply-topic-form";
import { ProjectStatusNavigation } from "@/app/topics/project-portal-chrome";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { TopicApplicationPage } from "@/modules/topic-application/application/topic-application-ports";
import type { PublicTopicPage, PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const applicationStatus = {
  PENDING: { label: "검토 중", tone: "info" },
  ACCEPTED: { label: "수락", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const;

function activeHref(input: { phase: PublicTopicPhase; programId?: string; query?: string; sort?: PublicTopicSort; page?: number }) {
  const params = new URLSearchParams({ phase: input.phase });
  if (input.programId) params.set("programId", input.programId);
  if (input.query) params.set("q", input.query);
  if (input.sort === "DEADLINE") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return `/topics?${params.toString()}`;
}

function daysUntil(deadline: Date, now: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1_000)));
}

export function ActiveProjectsView({ profile, programs, programId, topics, applications, phase, query, sort, now }: {
  profile: StudentProfile | null;
  programs: ProjectProgramRecord[];
  programId?: string;
  topics: PublicTopicPage;
  applications?: TopicApplicationPage;
  phase: PublicTopicPhase;
  query: string;
  sort: PublicTopicSort;
  now: Date;
}) {
  return <div className="space-y-10 pt-7">
    {!profile && applications ? <section aria-labelledby="profile-onboarding-title" className="grid gap-5 border-y border-[var(--line)] bg-[var(--primary-subtle)] px-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7">
      <div><p className="eyebrow">첫 시작</p><h2 id="profile-onboarding-title" className="mt-2 text-xl font-extrabold">프로젝트 프로필을 먼저 완성해 주세요</h2><p className="muted mt-2 text-sm leading-6">관심 분야, 보유 기술과 활동 가능 시간을 저장하면 지원서에 자동으로 채워집니다.</p></div>
      <Link href="/account" className="button-primary justify-self-start">프로필 작성</Link>
    </section> : null}

    <section aria-labelledby="program-choice-title" className="border border-[var(--line)] p-5 sm:p-7">
      <h2 id="program-choice-title" className="text-lg font-extrabold">어떤 프로그램의 주제를 찾고 있나요?</h2>
      <nav aria-label="프로그램 선택" className="-mx-1 mt-5 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        <Link href={activeHref({ phase, query, sort })} aria-current={!programId ? "page" : undefined} className={`program-choice min-h-24 w-56 shrink-0 snap-start border p-5 text-left ${!programId ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] hover:border-[var(--primary)]"}`}><span className="text-sm font-extrabold">전체 프로그램</span></Link>
        {programs.map((program) => <Link key={program.id} href={activeHref({ phase, programId: program.id, query, sort })} aria-current={program.id === programId ? "page" : undefined} className={`program-choice min-h-24 w-64 shrink-0 snap-start border p-5 text-left ${program.id === programId ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line)] hover:border-[var(--primary)]"}`}><span className="text-xs font-semibold opacity-75">{program.category}</span><span className="mt-1 block font-extrabold leading-6">{program.name}</span></Link>)}
      </nav>
    </section>

    <ProjectStatusNavigation view="active" phase={phase} counts={topics.counts} programId={programId} query={query} sort={sort} />

    <section aria-label="프로젝트 검색과 필터" className="grid gap-5 border-b border-[var(--line)] pb-7">
      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]" action="/topics">
        <input type="hidden" name="phase" value={phase} />
        {programId ? <input type="hidden" name="programId" value={programId} /> : null}
        <label><span className="sr-only">프로젝트 검색</span><input name="q" defaultValue={query} maxLength={100} placeholder="프로젝트명, 설명, 기술, 교수명 검색" className="field" /></label>
        <label><span className="sr-only">정렬</span><select name="sort" defaultValue={sort} className="field"><option value="LATEST">최신 공개순</option><option value="DEADLINE">마감 임박순</option></select></label>
        <button className="button-secondary">검색</button>
      </form>
    </section>

    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">프로젝트 목록</p><h2 id="project-results-title" className="mt-2 text-2xl font-black tracking-[-0.03em]">비교하고 지원할 프로젝트</h2></div><p className="muted text-sm">검색 결과 {topics.total}개</p></div>
      {!topics.items.length ? <EmptyState title="조건에 맞는 프로젝트가 없습니다" description="상태나 프로그램 태그를 바꾸거나 검색어를 지워 다시 확인해 주세요." /> : <ul className="project-card-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">{topics.items.map((topic) => {
        const recruiting = topic.recruitmentStartsAt <= now && topic.recruitmentEndsAt > now && topic.memberCount < topic.capacity;
        const application = topic.ownApplicationStatus;
        const skills = [...topic.requiredSkills, ...topic.preferredSkills].slice(0, 4);
        return <li key={topic.id} className="project-card flex min-h-[27rem] flex-col border border-[var(--line)] bg-white p-5 sm:p-6"><article aria-labelledby={`topic-${topic.id}`} className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-bold text-[var(--ink)]">{topic.programName}</span>{recruiting ? <StatusBadge tone="info">모집 중</StatusBadge> : <StatusBadge>모집 전·종료</StatusBadge>}</div>
          <h3 id={`topic-${topic.id}`} className="mt-4 text-xl font-black leading-7 tracking-[-0.025em]">{topic.title}</h3>
          <p className="muted mt-3 line-clamp-3 text-sm leading-6">{topic.description}</p>
          <ul aria-label="필요 기술" className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <li key={skill} className="rounded bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold">{skill}</li>)}</ul>
          <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-5 text-sm"><div><dt className="muted text-xs">지도교수</dt><dd className="mt-1 font-bold">{topic.authorName}</dd></div><div><dt className="muted text-xs">모집 인원</dt><dd className="mt-1 font-bold">{topic.memberCount} / {topic.capacity}명</dd></div><div className="col-span-2"><dt className="muted text-xs">모집 마감</dt><dd className="mt-1 flex items-center justify-between gap-3 font-semibold"><time dateTime={topic.recruitmentEndsAt.toISOString()}>{koreanDate.format(topic.recruitmentEndsAt)}</time>{topic.recruitmentEndsAt > now ? <span className="text-xs font-bold text-[var(--ink)]">D-{daysUntil(topic.recruitmentEndsAt, now)}</span> : null}</dd></div></dl>
          <div className="mt-5 grid grid-cols-2 gap-2"><Link href={`/topics/${topic.id}`} className="button-secondary">상세 보기</Link>{application ? <span className="flex min-h-11 items-center justify-center"><StatusBadge tone={applicationStatus[application].tone}>{applicationStatus[application].label}</StatusBadge></span> : applications && recruiting ? <ApplyTopicForm topicId={topic.id} topicTitle={topic.title} profile={profile} /> : <span className="muted flex min-h-11 items-center justify-center text-xs">{applications ? "지원 불가" : "상세 확인"}</span>}</div>
        </article></li>;
      })}</ul>}
      {topics.totalPages > 1 ? <nav aria-label="프로젝트 페이지" className="mt-6 flex items-center justify-between"><span className="muted text-sm">{topics.page} / {topics.totalPages} 페이지</span><div className="flex gap-2">{topics.page > 1 ? <Link className="button-quiet" href={activeHref({ phase, programId, query, sort, page: topics.page - 1 })}>이전</Link> : null}{topics.page < topics.totalPages ? <Link className="button-quiet" href={activeHref({ phase, programId, query, sort, page: topics.page + 1 })}>다음</Link> : null}</div></nav> : null}
    </section>

    {applications ? <section aria-labelledby="application-summary-title" className="border border-[var(--line)] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">내 지원</p><h2 id="application-summary-title" className="mt-2 text-xl font-extrabold">내 지원 현황</h2></div><Link href="/topics/applications" className="button-quiet">전체 이력 보기 <span aria-hidden="true" className="ml-2">→</span></Link></div>
      <dl className="mt-6 grid grid-cols-2 divide-x divide-y divide-[var(--line)] border-y border-[var(--line)] sm:grid-cols-4 sm:divide-y-0"><div className="px-4 py-5"><dt className="muted text-xs">지원 완료</dt><dd className="mt-1 text-2xl font-black">{applications.total}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">검토 중</dt><dd className="mt-1 text-2xl font-black">{applications.counts.PENDING}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">선정</dt><dd className="mt-1 text-2xl font-black text-[var(--success)]">{applications.counts.ACCEPTED}건</dd></div><div className="px-4 py-5"><dt className="muted text-xs">미선정</dt><dd className="mt-1 text-2xl font-black text-[var(--muted)]">{applications.counts.REJECTED}건</dd></div></dl>
    </section> : null}
  </div>;
}
