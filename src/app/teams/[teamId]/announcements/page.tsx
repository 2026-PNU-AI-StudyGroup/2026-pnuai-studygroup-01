import Link from "next/link";
import type { Metadata } from "next";

import { ProjectAnnouncementList } from "@/app/teams/[teamId]/_components/project-announcement-list";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 공지");
}

export default async function TeamAnnouncementsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const audience = await resolveAnnouncementAudience(actor);
  const announcements = await new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  ).listForTeam(audience, teamId);
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
          <Link className="button-primary" href={`/announcements/new?target=${encodeURIComponent(`team:${teamId}`)}`}>
            <UiText>{"공지 작성"}</UiText>
          </Link>
        ) : undefined}
      />
      <ProjectAnnouncementList announcements={announcements} />
    </section>
  );
}
