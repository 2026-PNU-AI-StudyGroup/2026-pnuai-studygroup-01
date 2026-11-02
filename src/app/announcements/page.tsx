import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { ScreenTitle } from "@/app/_components/screen-title";
import { resolveAnnouncementAudience } from "@/app/announcements/_lib/announcement-audience";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { canCreateSystemAnnouncement } from "@/modules/announcement/domain/announcement-policy";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { cardClass, CardHead, Pill } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import {
  UiDate,
  UiText,
} from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { markdownToPlainText } from "@/shared/ui/render-markdown";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { AddIcon, PinIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("공지사항");
}

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// 컴포넌트 렌더 밖(모듈 스코프)에서 시각을 읽어 react-hooks/purity 위반 회피.
function isRecentAnnouncement(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < NEW_WINDOW_MS;
}

// 넓은 목록은 제목, 작성자, 등록일 세 칸. 좁으면 나머지 칸이 제목 밑 한 줄로 흐른다.
// 이 목록은 프로그램, 팀 공지를 빼고 시스템 전체 공지만 담아 대상 칸은 두지 않는다(언제나 전체 공개).
const columns = "@min-[44rem]:grid-cols-[minmax(0,1fr)_7rem_6.5rem]";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const audience = await resolveAnnouncementAudience(actor);
  const data = await new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  ).listSystem(audience, requestedPage);
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (page > 1) query.set("page", String(page));
    const suffix = query.toString();
    return suffix ? `/announcements?${suffix}` : "/announcements";
  };
  const canCreate = canCreateSystemAnnouncement(actor.role);
  // 첫 쪽에는 고정 공지 다음에 최신 공지가 온다. 최근 7일 새 공지 수와 마지막 공지일을 여기서 센다.
  // ponytail: 고정 공지가 한 쪽(20건)을 넘으면 마지막 공지가 다음 쪽으로 밀린다. 그때는 저장소에서 따로 센다.
  const recentCount = data.items.filter(({ createdAt }) => isRecentAnnouncement(createdAt)).length;
  const latest = data.items.reduce<Date | null>((last, { createdAt }) => (!last || createdAt > last ? createdAt : last), null);
  const finding = data.page !== 1 || !latest ? undefined : recentCount ? (
    <b className="font-semibold"><UiText>{`최근 7일 동안 새 공지가 ${recentCount}건 올라왔습니다.`}</UiText></b>
  ) : (
    <>
      <UiText>{"최근 7일 동안 올라온 새 공지가 없습니다."}</UiText>{" "}
      <span className="whitespace-nowrap text-[var(--muted)]"><UiText>{"마지막 공지"}</UiText> <span className="tabular-nums"><UiDate value={latest} /></span></span>
    </>
  );

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath="/announcements"
    >
      <ExplorerLayout>
        <div className="grid gap-3.5">
          <ScreenTitle
            id="announcements-title"
            title={<UiText>{"공지사항"}</UiText>}
            finding={finding}
            actions={canCreate && data.total > 0
              ? <Link className="button-primary button-compact gap-1.5" href="/announcements/new"><AddIcon className="size-4 shrink-0" /><UiText>{"새 공지 작성"}</UiText></Link>
              : undefined}
          />

          <section aria-labelledby="announcement-list-title" className={`${cardClass} @container`}>
            <CardHead id="announcement-list-title" title={<UiText>{"전체 공지"}</UiText>} count={<>{data.total}<UiText>{"건"}</UiText></>} />
            {data.items.length === 0 ? (
              <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-[var(--ink)]"><UiText>{"등록된 공지가 없습니다"}</UiText></h3>
                  <p className="mt-0.5 text-[var(--muted)]"><UiText>{canCreate ? "첫 공지를 작성하면 모든 사용자가 이곳에서 확인할 수 있습니다." : "새 공지가 등록되면 이 목록에 표시됩니다."}</UiText></p>
                </div>
                {canCreate ? <Link className="button-primary button-compact gap-1.5" href="/announcements/new"><AddIcon className="size-4 shrink-0" /><UiText>{"첫 공지 작성"}</UiText></Link> : null}
              </div>
            ) : (
              <>
                <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[44rem]:grid ${columns}`}>
                  <span><UiText>{"제목"}</UiText></span>
                  <span><UiText>{"작성자"}</UiText></span>
                  <span className="text-right"><UiText>{"등록일"}</UiText></span>
                </div>
                <ol>
                  {data.items.map((announcement) => (
                    <li key={announcement.id} className="border-t border-[var(--line)]">
                      <Link href={`/announcements/${announcement.id}`} className={`record-row group grid gap-x-5 gap-y-1 px-5 py-3 @min-[44rem]:items-center ${columns}`}>
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {announcement.pinned ? <><PinIcon className="size-3.5 flex-none text-[var(--primary)]" /><span className="sr-only"><UiText>{"고정"}</UiText></span></> : null}
                            <span className="truncate text-sm font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--primary)]"><UiText>{announcement.title}</UiText></span>
                            {isRecentAnnouncement(announcement.createdAt) ? <Pill tone="accent">{"새 글"}</Pill> : null}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.8125rem] leading-[1.125rem] text-[var(--muted)]"><UiText>{markdownToPlainText(announcement.content)}</UiText></span>
                        </span>
                        <span className="flex min-w-0 flex-wrap gap-x-3 text-[0.8125rem] text-[var(--muted)] @min-[44rem]:contents">
                          <span className="truncate @min-[44rem]:text-[var(--ink)]">{announcement.authorName}</span>
                          <time className="tabular-nums @min-[44rem]:text-right" dateTime={announcement.createdAt.toISOString()}>
                            <UiDate value={announcement.createdAt} mode="date" />
                          </time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {data.totalPages > 1 ? (
              <div className="px-5 pb-5">
                <ProjectPagination page={data.page} totalPages={data.totalPages} href={pageHref} ariaLabel="공지사항 페이지" />
              </div>
            ) : null}
          </section>
        </div>
      </ExplorerLayout>
    </AppShell>
  );
}
