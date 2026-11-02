import Link from "next/link";
import type { Metadata } from "next";

import { ProjectAnnouncementList } from "@/app/projects/[projectId]/_components/project-announcement-list";
import { monthDay, WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AddIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 공지");
}

export default async function TeamAnnouncementsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId);
  const audience = await resolveAnnouncementAudience(actor);
  const announcements = await new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  ).listForTeam(audience, workspace.id);
  const canWrite = actor.role === "ADMIN" || workspace.access.isPrimaryAdvisor;

  const latest = announcements.reduce<(typeof announcements)[number] | undefined>((found, item) => !found || item.createdAt > found.createdAt ? item : found, undefined);

  return (
    <section aria-labelledby="project-announcements-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        title="프로젝트 공지"
        titleId="project-announcements-title"
        finding={latest ? <UiText>{`최근 공지는 ${monthDay.format(latest.createdAt)} ${latest.authorName}의 ${latest.title}입니다.`}</UiText> : undefined}
        actions={canWrite ? (
          <Link className="button-primary button-compact gap-1.5" href={`/announcements/new?target=${encodeURIComponent(`team:${workspace.id}`)}`}>
            <AddIcon className="size-4 shrink-0" /><UiText>{"공지 작성"}</UiText>
          </Link>
        ) : undefined}
      />
      <section aria-labelledby="project-announcement-list-title" className={cardClass}>
        <CardHead id="project-announcement-list-title" title={<UiText>{"공지 목록"}</UiText>} count={<>{announcements.length}<UiText>{"건"}</UiText></>} />
        <ProjectAnnouncementList announcements={announcements} />
      </section>
    </section>
  );
}
