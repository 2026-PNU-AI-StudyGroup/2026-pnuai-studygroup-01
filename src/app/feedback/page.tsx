import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackComposer } from "@/app/feedback/_components/feedback-composer";
import {
  FeedbackPostCard,
  type FeedbackPostView,
} from "@/app/feedback/_components/feedback-post-card";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { getServerTranslator } from "@/modules/translation/infrastructure/request-locale";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("피드백 게시판");
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: SearchParamValue; status?: SearchParamValue }>;
}) {
  const [actor, params, t] = await Promise.all([getCurrentActor(), searchParams, getServerTranslator()]);
  const requestedStatus = firstSearchParam(params.status);
  const status = requestedStatus === "resolved" ? "RESOLVED" : requestedStatus === "open" ? "OPEN" : undefined;
  const parsedPage = Number(firstSearchParam(params.page) ?? "1");
  const pageSize = 20;
  // 상태별 수는 탭과 제목 밑 한 줄이 같이 쓴다. 지금 보는 탭의 수가 곧 쪽 나눔의 전체 수다.
  const [statusCounts, urgentOpen] = await Promise.all([
    prisma.feedbackPost.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.feedbackPost.count({ where: { status: "OPEN", priority: "URGENT" } }),
  ]);
  const openCount = statusCounts.find((row) => row.status === "OPEN")?._count._all ?? 0;
  const resolvedCount = statusCounts.find((row) => row.status === "RESOLVED")?._count._all ?? 0;
  const allCount = openCount + resolvedCount;
  const total = status === "OPEN" ? openCount : status === "RESOLVED" ? resolvedCount : allCount;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, totalPages) : 1;
  const posts = await prisma.feedbackPost.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      statusChanges: { orderBy: { createdAt: "asc" } },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const canModerate = actor?.role === "ADMIN" || actor?.role === "PROFESSOR";
  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status === "RESOLVED" ? "resolved" : "open");
    if (targetPage > 1) query.set("page", String(targetPage));
    const suffix = query.toString();
    return suffix ? `/feedback?${suffix}` : "/feedback";
  };
  const finding = !allCount ? undefined : openCount ? (
    <>
      <b className="font-semibold"><UiText>{`미해결 피드백이 ${openCount}건 있습니다.`}</UiText></b>
      {urgentOpen ? <>{" "}<UiText>{`그중 긴급이 ${urgentOpen}건입니다.`}</UiText></> : null}
    </>
  ) : <UiText>{`등록된 피드백 ${allCount}건이 모두 해결되었습니다.`}</UiText>;
  const tabs = [
    { value: undefined, label: "전체", count: allCount },
    { value: "OPEN", label: "미해결", count: openCount },
    { value: "RESOLVED", label: "해결됨", count: resolvedCount },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 sm:px-8">
        <div className="mx-auto flex h-16 max-w-[60rem] items-center justify-between gap-4">
          <Brand href="/" />
          <UiLink href="/" className="text-[0.8125rem] font-medium text-[var(--muted)] hover:text-[var(--ink)]">
            <UiText>{"로그인으로 돌아가기"}</UiText>
          </UiLink>
        </div>
      </header>

      <main className="mx-auto grid max-w-[60rem] gap-3.5 px-5 pb-16 pt-8 sm:px-8">
        <FeedbackComposer signedInAs={actor ? { name: actor.name, email: actor.email } : undefined} finding={finding} />

        <section aria-labelledby="feedback-list-title" className={cardClass}>
          <CardHead id="feedback-list-title" title={<UiText>{"등록된 피드백"}</UiText>} />
          {/* 밑줄 탭. 탭마다 그 상태의 글 수를 붙인다. 수는 탭에만 두고 카드 머리에 다시 적지 않는다. */}
          <nav aria-label={t("피드백 상태 필터")} className="flex gap-5 overflow-x-auto px-5">
            {tabs.map((tab) => {
              const current = status === tab.value;
              return (
                <Link
                  key={tab.label}
                  href={tab.value ? `/feedback?status=${tab.value === "RESOLVED" ? "resolved" : "open"}` : "/feedback"}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex h-10 flex-none items-center gap-1.5 border-b-2 text-sm transition-colors ${current ? "border-[var(--primary)] font-medium text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
                >
                  <UiText>{tab.label}</UiText>
                  <span className="tabular-nums text-[var(--muted)]">{tab.count}</span>
                </Link>
              );
            })}
          </nav>
          {posts.length ? (
            posts.map((post) => (
              <FeedbackPostCard key={post.id} post={post as FeedbackPostView} canModerate={canModerate} />
            ))
          ) : (
            <div role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
              <h3 className="font-medium text-[var(--ink)]"><UiText>{status === "OPEN" ? "미해결 피드백이 없습니다" : status === "RESOLVED" ? "해결된 피드백이 없습니다" : "아직 등록된 피드백이 없습니다"}</UiText></h3>
              <p className="mt-0.5 text-[var(--muted)]"><UiText>{"새 피드백이 등록되면 이 목록에 표시됩니다."}</UiText></p>
            </div>
          )}
          {totalPages > 1 ? (
            <div className="px-5 pb-5">
              <ProjectPagination page={page} totalPages={totalPages} href={pageHref} ariaLabel="피드백 페이지" />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
