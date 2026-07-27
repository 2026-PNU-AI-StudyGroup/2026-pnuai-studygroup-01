import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { canCreateAnnouncement } from "@/modules/announcement/domain/announcement-policy";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import {
  UiDate,
  UiText,
} from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("공지사항");
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  ).list(requestedPage);

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath="/announcements"
    >
      <main className="content-shell page-enter space-y-8">
        <PageHeader
          eyebrow="PMS 소식"
          title="공지사항"
          description="프로젝트 운영에 필요한 일정과 안내를 확인합니다."
          actions={canCreateAnnouncement(actor.role)
            ? <Link className="button-primary" href="/announcements/new"><UiText>{"새 공지 작성"}</UiText></Link>
            : undefined}
        />

        <section aria-labelledby="announcement-list-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="announcement-list-title" className="text-xl font-black tracking-[-0.03em]">
              <UiText>{"전체 공지"}</UiText>
            </h2>
            <p className="text-sm font-semibold text-[var(--muted)]">
              <UiText>{"총"}</UiText>{" "}{data.total}<UiText>{"건"}</UiText>
            </p>
          </div>

          {data.items.length === 0 ? (
            <EmptyState
              title="등록된 공지가 없습니다"
              description="새 공지가 등록되면 최신 순서로 이곳에 표시됩니다."
              action={canCreateAnnouncement(actor.role)
                ? <Link className="button-secondary" href="/announcements/new"><UiText>{"첫 공지 작성"}</UiText></Link>
                : undefined}
            />
          ) : (
            <ol className="panel divide-y divide-[var(--line)] px-5 sm:px-7">
              {data.items.map((announcement) => (
                <li key={announcement.id}>
                  <Link
                    href={`/announcements/${announcement.id}`}
                    className="group grid min-h-28 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"
                  >
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)] group-hover:text-[var(--primary-hover)]">
                        <UiText>{announcement.title}</UiText>
                      </h3>
                      <p className="mt-2 line-clamp-1 text-sm text-[var(--muted)]">
                        <UiText>{announcement.content.replace(/\s+/g, " ")}</UiText>
                      </p>
                    </div>
                    <div className="text-sm text-[var(--muted)] sm:text-right">
                      <p className="font-semibold text-[var(--ink)]">{announcement.authorName}</p>
                      <time dateTime={announcement.createdAt.toISOString()}>
                        <UiDate value={announcement.createdAt} mode="date" />
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {data.totalPages > 1 ? (
          <UiNav aria-label="공지사항 페이지" className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">
              {data.page} / {data.totalPages} <UiText>{"페이지"}</UiText>
            </span>
            <div className="flex gap-2">
              {data.page > 1 ? (
                <Link className="button-secondary" href={data.page === 2 ? "/announcements" : `/announcements?page=${data.page - 1}`}><UiText>{"이전"}</UiText></Link>
              ) : null}
              {data.page < data.totalPages ? (
                <Link className="button-secondary" href={`/announcements?page=${data.page + 1}`}><UiText>{"다음"}</UiText></Link>
              ) : null}
            </div>
          </UiNav>
        ) : null}
      </main>
    </AppShell>
  );
}
