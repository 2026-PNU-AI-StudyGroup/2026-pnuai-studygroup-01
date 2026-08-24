import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { AnnouncementForm } from "@/app/announcements/_components/announcement-form";
import { announcementReturnHref } from "@/app/_lib/announcement-return-href";
import {
  AnnouncementNotFoundError,
  AnnouncementService,
} from "@/modules/announcement/application/manage-announcements";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PageHeader } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("공지 수정");
}

export default async function EditAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ announcementId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { announcementId } = await params;
  const rawReturnTo = (await searchParams).returnTo;
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
  if (!service.canManage(actor, announcement)) {
    redirect(`/announcements/${announcement.id}`);
  }
  const fallbackHref = announcement.teamId
    ? `/projects/${announcement.projectId}/announcements`
    : announcement.programId
      ? `/topics?programId=${encodeURIComponent(announcement.programId)}`
      : `/announcements/${announcementId}`;
  const returnHref = announcementReturnHref(Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo, fallbackHref);
  const initialTarget = announcement.teamId
    ? `team:${announcement.teamId}`
    : announcement.programId
      ? `program:${announcement.programId}`
      : "";

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath={`/announcements/${announcement.id}/edit`}
    >
      <main className="content-shell page-enter pb-28 lg:pb-16">
        <div className="mx-auto max-w-4xl space-y-7">
          <PageHeader
            compact
            title="공지 수정"
            description="변경한 내용은 저장 즉시 모든 구성원에게 표시됩니다."
            actions={<Link className="button-secondary" href={returnHref}><UiText>{"취소"}</UiText></Link>}
          />
          <AnnouncementForm
            announcementId={announcement.id}
            targets={{ programs: [], teams: [] }}
            initialTitle={announcement.title}
            initialContent={announcement.content}
            initialPinned={announcement.pinned}
            initialPopup={announcement.popup}
            initialTarget={initialTarget}
            initialVisibility={announcement.visibility}
            initialAttachments={announcement.attachments}
            returnHref={returnHref}
            targetLocked
            targetLabel={announcement.teamName ?? announcement.programName ?? "시스템 전체"}
          />
        </div>
      </main>
    </AppShell>
  );
}
