import type { Metadata } from "next";

import { FeedbackComposer } from "@/app/feedback/_components/feedback-composer";
import {
  FeedbackPostCard,
  type FeedbackPostView,
} from "@/app/feedback/_components/feedback-post-card";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("피드백 게시판");
}

export default async function FeedbackPage() {
  const posts = await prisma.feedbackPost.findMany({
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: { comments: { orderBy: { createdAt: "asc" } } },
    take: 200,
  });

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
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[var(--muted)]">
              <UiText>{"등록된 피드백"}</UiText>{" "}{posts.length}
            </h2>
          </div>
          {posts.length ? (
            posts.map((post) => (
              <FeedbackPostCard key={post.id} post={post as FeedbackPostView} />
            ))
          ) : (
            <EmptyState title="아직 등록된 피드백이 없습니다." />
          )}
        </section>
      </main>
    </div>
  );
}
