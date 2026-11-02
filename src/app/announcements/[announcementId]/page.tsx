import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { DeleteAnnouncementForm } from "@/app/_components/delete-announcement-form";
import { ScreenTitle } from "@/app/_components/screen-title";
import { resolveAnnouncementAudience } from "@/app/announcements/_lib/announcement-audience";
import { announcementScope } from "@/app/announcements/_lib/announcement-scope";
import {
  AnnouncementNotFoundError,
  AnnouncementService,
} from "@/modules/announcement/application/manage-announcements";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { formatAttachmentSize } from "@/modules/announcement/ui/announcement-attachment-presentation";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { cardClass, CardHead, Pill } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import {
  UiDate,
  UiText,
} from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { ChevronIcon, EditIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("공지사항 상세");
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { announcementId } = await params;
  const service = new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  );
  let announcement;
  try {
    announcement = await service.get(announcementId);
  } catch (error) {
    if (error instanceof AnnouncementNotFoundError) notFound();
    throw error;
  }
  const audience = await resolveAnnouncementAudience(actor);
  if (!service.canView(audience, announcement)) notFound();
  const canManage = service.canManage(actor, announcement);
  const wasUpdated = announcement.updatedAt.getTime() !== announcement.createdAt.getTime();
  const listHref = announcement.teamId
    ? `/projects/${announcement.projectId}/announcements`
    : announcement.programId
      ? `/topics?programId=${encodeURIComponent(announcement.programId)}`
      : "/announcements";
  const scope = announcementScope(announcement);
  const attachments = announcement.attachments;

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath={`/announcements/${announcement.id}`}
      crumbs={[{ label: announcement.title }]}
    >
      <ExplorerLayout>
        <div className="grid gap-3.5">
          <ScreenTitle
            id="announcement-title"
            title={<UiText>{announcement.title}</UiText>}
            aside={announcement.pinned ? <Pill tone="accent">{"상단 고정"}</Pill> : null}
            meta={(
              <span className="tabular-nums">
                <span className="font-medium text-[var(--ink)]">{announcement.authorName}</span>
                {", "}<time dateTime={announcement.createdAt.toISOString()}><UiDate value={announcement.createdAt} mode="dateTime" /></time>
                {wasUpdated ? <>{", "}<UiText>{"수정"}</UiText> <UiDate value={announcement.updatedAt} mode="dateTime" /></> : null}
              </span>
            )}
            actions={(
              <>
                <Link className="button-secondary button-compact gap-1.5" href={listHref}><ChevronIcon className="size-4 shrink-0 rotate-180" /><UiText>{"공지 목록"}</UiText></Link>
                {/* 예전에는 시스템 공지에서 수정, 삭제가 아이콘만이라 눌러야 할 것이 있는지 알기 어려웠다.
                    글자를 붙여 무엇을 하는 버튼인지 보이게 한다. */}
                {canManage ? (
                  <>
                    <Link className="button-secondary button-compact gap-1.5" href={`/announcements/${announcement.id}/edit`}>
                      <EditIcon className="size-4 shrink-0" /><UiText>{"수정"}</UiText>
                    </Link>
                    <DeleteAnnouncementForm announcementId={announcement.id} />
                  </>
                ) : null}
              </>
            )}
          />

          {/* 본문이 이 화면의 답이라 가장 넓은 칸을 준다. 받는 사람과 첨부파일은 오른쪽 좁은 칸, 좁은 화면에서는 본문 밑. */}
          <div className="@container">
            <div className="grid items-start gap-3.5 @min-[60rem]:grid-cols-[minmax(0,1fr)_20rem]">
              <article aria-labelledby="announcement-title" className={`${cardClass} px-5 py-6 sm:px-8 sm:py-7`}>
                <div className="max-w-[72ch] space-y-4 text-[0.9375rem] leading-7 text-[var(--ink)] [overflow-wrap:anywhere]">
                  <LocalizedMarkdown text={announcement.content} />
                </div>
              </article>

              <div className="grid min-w-0 gap-3.5">
                <section aria-labelledby="announcement-scope-title" className={cardClass}>
                  <CardHead id="announcement-scope-title" title={<UiText>{"받는 사람"}</UiText>} />
                  <dl className="px-5 pb-3 text-[0.8125rem]">
                    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-2">
                      <dt className="text-[var(--muted)]"><UiText>{"대상"}</UiText></dt>
                      <dd className="min-w-0 break-words text-[var(--ink)]"><UiText>{scope.target}</UiText></dd>
                    </div>
                    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t border-[var(--line)] py-2">
                      <dt className="text-[var(--muted)]"><UiText>{"열람 범위"}</UiText></dt>
                      <dd className="text-[var(--ink)]"><UiText>{scope.audience}</UiText></dd>
                    </div>
                  </dl>
                </section>

                <section aria-labelledby="announcement-files-title" className={cardClass}>
                  <CardHead id="announcement-files-title" title={<UiText>{"첨부파일"}</UiText>} count={<>{attachments.length}<UiText>{"개"}</UiText></>} />
                  {attachments.length ? (
                    // 트랙을 칸 폭으로 묶는다. auto 트랙이면 긴 파일명만큼 늘어나 용량 표시가 밖으로 잘린다.
                    <ul className="grid grid-cols-[minmax(0,1fr)] px-5 pb-3">
                      {attachments.map((attachment) => (
                        <li key={attachment.fileId} className="[&+li]:border-t [&+li]:border-[var(--line)]">
                          <a href={`/api/files/${attachment.fileId}`} className="group flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                            <span className="min-w-0 truncate font-medium text-[var(--ink)] group-hover:text-[var(--primary)] group-hover:underline group-hover:underline-offset-[3px]">{attachment.originalName}</span>
                            <span className="shrink-0 tabular-nums text-xs text-[var(--muted)]">{formatAttachmentSize(attachment.size)}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"첨부파일이 없습니다."}</UiText></p>}
                </section>
              </div>
            </div>
          </div>
        </div>
      </ExplorerLayout>
    </AppShell>
  );
}
