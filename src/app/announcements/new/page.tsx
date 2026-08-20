import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { AnnouncementForm } from "@/app/announcements/_components/announcement-form";
import { resolveAnnouncementTargets } from "@/app/announcements/_lib/announcement-audience";
import {
  canCreateAnnouncement,
  canCreateSystemAnnouncement,
} from "@/modules/announcement/domain/announcement-policy";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { PageHeader } from "@/shared/ui/page-primitives";
import { ChevronIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("새 공지 작성");
}

export default async function NewAnnouncementPage({ searchParams }: { searchParams: Promise<{ target?: string | string[] }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!canCreateAnnouncement(actor.role)) redirect("/announcements");
  const targets = await resolveAnnouncementTargets(actor);
  // 프로젝트 공지는 프로젝트 화면에서 전달한 소관 팀으로만 작성한다.
  const requested = (await searchParams).target;
  const requestedTarget = Array.isArray(requested) ? requested[0] : requested;
  const initialTeam = targets.teams.find((team) => `team:${team.id}` === requestedTarget);
  if (!initialTeam && !canCreateSystemAnnouncement(actor.role)) redirect("/announcements");
  const initialTarget = initialTeam ? `team:${initialTeam.id}` : "";
  const listHref = initialTeam ? `/projects/${initialTeam.projectId}/announcements` : "/announcements";
  const systemScope = !initialTeam;

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath="/announcements/new"
    >
      <main className="content-shell page-enter pb-28 lg:pb-16">
        <div className="mx-auto max-w-4xl space-y-7">
          <PageHeader
            compact
            title={systemScope ? "공지 작성" : "프로젝트 공지 작성"}
            description={systemScope
              ? "공지를 받을 대상을 고른 뒤 작성합니다. 전체, 프로그램, 프로젝트 중에서 고를 수 있습니다."
              : `${initialTeam.name} 구성원이 확인해야 할 프로젝트 운영 안내를 작성합니다.`}
            actions={<Link className="button-secondary gap-2" href={listHref}><ChevronIcon className="size-4 shrink-0 rotate-180" /><UiText>{"목록으로"}</UiText></Link>}
          />
          {/* 프로젝트 화면에서 대상을 지정해 들어온 경우에만 대상을 고정한다.
              공지 목록에서 들어오면 전체·프로그램·프로젝트를 직접 고른다. */}
          <AnnouncementForm
            targets={targets}
            initialTarget={initialTarget}
            initialVisibility={systemScope ? "AUTHENTICATED" : "TARGET_MEMBERS"}
            targetLocked={!systemScope}
            targetLabel={systemScope ? undefined : initialTeam.name}
          />
        </div>
      </main>
    </AppShell>
  );
}
