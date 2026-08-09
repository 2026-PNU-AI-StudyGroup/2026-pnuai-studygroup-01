import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { AnnouncementForm } from "@/app/announcements/_components/announcement-form";
import { resolveAnnouncementTargets } from "@/app/announcements/_lib/announcement-audience";
import { canCreateAnnouncement } from "@/modules/announcement/domain/announcement-policy";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { PageHeader } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("새 공지 작성");
}

export default async function NewAnnouncementPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (!canCreateAnnouncement(actor.role)) redirect("/announcements");
  const targets = await resolveAnnouncementTargets(actor);

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
            title="새 공지 작성"
            description="모든 구성원이 확인해야 할 운영 안내를 작성합니다."
            actions={<Link className="button-secondary" href="/announcements"><UiText>{"목록으로"}</UiText></Link>}
          />
          <AnnouncementForm targets={targets} />
        </div>
      </main>
    </AppShell>
  );
}
