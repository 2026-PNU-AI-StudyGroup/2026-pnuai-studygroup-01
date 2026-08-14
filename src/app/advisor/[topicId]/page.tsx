import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { findAssignedProject } from "@/modules/advisor/infrastructure/prisma-advisor-workspace-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { renderMarkdown } from "@/shared/ui/render-markdown";
import { ARTIFACT_TYPE_LABELS, ArtifactMedia, type ArtifactType } from "@/shared/ui/artifact-media";
import { DocumentIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("담당 프로젝트 상세");
}

export default async function AdvisorProjectDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  const topic = await findAssignedProject(prisma, actor.id, topicId);
  if (!topic) notFound();

  return (
    <section aria-labelledby="advisor-project-title" className="mx-auto max-w-4xl space-y-9">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]"><UiText>{topic.program.name}</UiText></p>
        <h1 id="advisor-project-title" className="mt-1.5 text-[clamp(1.5rem,2.8vw,2rem)] font-bold leading-[1.2] tracking-[-0.035em]"><UiText>{topic.title}</UiText></h1>
        {topic.team ? <p className="muted mt-2 text-sm font-semibold"><UiText>{topic.team.name}</UiText></p> : null}
      </header>

      {!topic.team ? (
        <p className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
          <UiText>{"팀이 아직 구성되지 않았습니다"}</UiText>
        </p>
      ) : (
        <>
          <section aria-labelledby="advisor-project-intro">
            <h2 id="advisor-project-intro" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"프로젝트 소개"}</UiText></h2>
            <div className="mt-3 space-y-3 text-[0.9375rem] text-[var(--ink)]">{renderMarkdown(topic.team.showcaseIntro ?? topic.description)}</div>
          </section>

          <section aria-labelledby="advisor-project-artifacts">
            <h2 id="advisor-project-artifacts" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"결과물"}</UiText></h2>
            {topic.team.artifacts.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><UiText>{"등록된 결과물이 없습니다."}</UiText></p>
            ) : (
              <ul className="mt-3 max-w-3xl space-y-9">
                {topic.team.artifacts.map((artifact) => (
                  <li key={artifact.id} className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]"><UiText>{ARTIFACT_TYPE_LABELS[artifact.type as ArtifactType]}</UiText></span>
                        <h3 className="text-base font-bold leading-6 tracking-[-0.02em] [overflow-wrap:anywhere]"><UiText>{artifact.title}</UiText></h3>
                      </div>
                      <time className="muted shrink-0 text-sm font-medium" dateTime={artifact.createdAt.toISOString()}><UiDate value={artifact.createdAt} mode="date" /></time>
                    </div>
                    <div className="mt-3">
                      <ArtifactMedia type={artifact.type as ArtifactType} title={artifact.title} fileId={artifact.fileId} externalUrl={artifact.externalUrl} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="advisor-project-reports">
            <h2 id="advisor-project-reports" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"보고서"}</UiText></h2>
            {topic.team.reports.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><UiText>{"제출된 보고서가 없습니다."}</UiText></p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--line)] rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
                {topic.team.reports.map((report) => {
                  const latest = report.versions[0];
                  return (
                    <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--ink)] [overflow-wrap:anywhere]"><UiText>{report.titleSnapshot}</UiText></p>
                        {latest ? (
                          <p className="muted mt-1 text-xs">
                            <UiText>{"버전"}</UiText> {latest.version} · {latest.file.originalName} ·{" "}
                            <UiDate value={latest.submittedAt} mode="dateTime" />
                          </p>
                        ) : (
                          <p className="muted mt-1 text-xs"><UiText>{"제출된 보고서가 없습니다."}</UiText></p>
                        )}
                      </div>
                      {latest ? (
                        <a className="button-secondary gap-2 shrink-0" href={`/api/files/${latest.fileId}`}><DocumentIcon className="size-4" /><UiText>{"파일 받기"}</UiText></a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
