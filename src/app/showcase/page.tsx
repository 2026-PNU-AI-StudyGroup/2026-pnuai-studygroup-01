import type { Metadata } from "next";
import Link from "next/link";

import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 쇼케이스");
}

export default async function ShowcaseGalleryPage() {
  const showcases = await prisma.projectShowcase.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 60,
    select: { teamId: true, summary: true, images: { where: { isCover: true }, take: 1, select: { id: true } } },
  });
  const teams = showcases.length
    ? await prisma.team.findMany({
        where: { id: { in: showcases.map((showcase) => showcase.teamId) } },
        select: { id: true, name: true, topic: { select: { title: true } } },
      })
    : [];
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Brand href="/" />
          <UiLink href="/" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
            <UiText>{"홈으로"}</UiText>
          </UiLink>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-8 sm:px-8 sm:py-10">
        <PageHeader eyebrow="프로젝트 갤러리" title="프로젝트 쇼케이스" description="학생 팀이 공개한 프로젝트 결과물을 둘러보세요." />
        {showcases.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {showcases.map((showcase) => {
              const team = teamById.get(showcase.teamId);
              const cover = showcase.images[0];
              return (
                <li key={showcase.teamId}>
                  <Link href={`/showcase/${showcase.teamId}`} className="group grid gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-3 transition-colors hover:border-[var(--primary)]">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-subtle)]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/showcase-images/${cover.id}`} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                      ) : null}
                    </div>
                    <div>
                      <h2 className="line-clamp-1 font-semibold text-[var(--ink)]"><UiText>{team?.topic.title ?? "프로젝트"}</UiText></h2>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{team?.name}</p>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{showcase.summary}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="아직 공개된 프로젝트가 없습니다." description="학생 팀이 프로젝트를 공개하면 여기에 표시됩니다." />
        )}
      </main>
    </div>
  );
}
