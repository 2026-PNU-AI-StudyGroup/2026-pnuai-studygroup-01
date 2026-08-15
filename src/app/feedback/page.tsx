import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackComposer } from "@/app/feedback/_components/feedback-composer";
import {
  FeedbackPostCard,
  type FeedbackPostView,
} from "@/app/feedback/_components/feedback-post-card";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { getServerTranslator } from "@/modules/translation/infrastructure/request-locale";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { EmptyState } from "@/shared/ui/page-primitives";
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
  const total = await prisma.feedbackPost.count({ where: status ? { status } : undefined });
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

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Brand href="/" />
          <UiLink href="/" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
            <UiText>{"로그인으로 돌아가기"}</UiText>
          </UiLink>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-8 px-5 py-8 sm:px-8 sm:py-10">
        <FeedbackComposer />

        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--muted)]">
              <UiText>{"등록된 피드백"}</UiText>{" "}{total}
            </h2>
            <nav aria-label={t("피드백 상태 필터")} className="flex items-center gap-2 text-sm font-semibold">
              {[
                [undefined, "전체"],
                ["open", "미해결"],
                ["resolved", "해결됨"],
              ].map(([value, label]) => (
                <Link
                  key={label}
                  href={value ? `/feedback?status=${value}` : "/feedback"}
                  className={status === (value === "resolved" ? "RESOLVED" : value === "open" ? "OPEN" : undefined) ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}
                >
                  <UiText>{label}</UiText>
                </Link>
              ))}
            </nav>
          </div>
          {posts.length ? (
            posts.map((post) => (
              <FeedbackPostCard key={post.id} post={post as FeedbackPostView} canModerate={canModerate} />
            ))
          ) : (
            <EmptyState title="아직 등록된 피드백이 없습니다" description="새 피드백이 등록되면 이 목록에 표시됩니다." />
          )}
          <ProjectPagination page={page} totalPages={totalPages} href={pageHref} ariaLabel="피드백 페이지" />
        </section>
      </main>
    </div>
  );
}
