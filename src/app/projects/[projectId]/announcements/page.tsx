import Link from "next/link";
import type { Metadata } from "next";

import { ProjectAnnouncementList } from "@/app/projects/[projectId]/_components/project-announcement-list";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
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

  return (
    <section aria-labelledby="project-announcements-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="프로젝트 공지"
        titleId="project-announcements-title"
        description="프로젝트 운영 안내와 주요 변경 사항을 확인합니다."
        bordered={false}
        meta={<span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-sm font-bold text-[var(--muted)]">{announcements.length}<UiText>{"건"}</UiText></span>}
        actions={canWrite ? (
          <Link className="button-primary gap-2" href={`/announcements/new?target=${encodeURIComponent(`team:${workspace.id}`)}`}>
            <AddIcon className="size-4 shrink-0" /><UiText>{"공지 작성"}</UiText>
          </Link>
        ) : undefined}
      />
      <ProjectAnnouncementList announcements={announcements} />
    </section>
  );
}
