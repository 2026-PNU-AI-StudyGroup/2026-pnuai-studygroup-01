import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectDeleteForm } from "@/app/professor/topics/_components/project-delete-form";
import { TopicStatusButton } from "@/app/professor/topics/_components/topic-status-button";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/app/_components/translated-text";
import { EditIcon, ProfileIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세 관리");
}
const statusPresentation = { PENDING_APPROVAL: ["승인 대기", "warning"], REJECTED: ["반려됨", "danger"], ACTIVE: ["진행", "info"], COMPLETED: ["완료", "neutral"], CANCELED: ["취소", "danger"] } as const;
const applicationModeLabel = { TEAM_ONLY: "팀 지원만", INDIVIDUAL_ONLY: "개인 지원만", INDIVIDUAL_OR_TEAM: "개인·팀 지원" } as const;

export default async function ManagedTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  let topic;
  try {
    topic = await new GetManagedTopicService(
      new PrismaTopicQueryRepository(prisma),
    ).execute(actor, topicId);
  } catch (error) { if (error instanceof ManagedTopicNotFoundError) notFound(); throw error; }
  const statusKey = topic.effectiveStatus === "FORMING" || topic.effectiveStatus === "IN_PROGRESS"
    ? "ACTIVE"
    : topic.effectiveStatus;
  const [statusLabel, statusTone] = statusPresentation[statusKey];
  const showApplicationSetup = !topic.studentProjectCreationEnabled;
  const teamSizeLabel = topic.projectTeamMinSize && topic.projectTeamMaxSize
    ? `${topic.projectTeamMinSize}–${topic.projectTeamMaxSize}명`
    : null;
  // 값이 없는 항목을 빈 칸으로 두면 줄만 늘어난다. 없다는 사실을 글자로 적는다.
  const requirementRows: Array<[string, string]> = [
    ["필수 기술", topic.requiredSkills.join(", ") || "없음"],
    ["우대 기술", topic.preferredSkills.join(", ") || "없음"],
    ["예상 역할", topic.roleExpectations.trim() || "없음"],
    ["활동 조건", topic.availabilityRequirement.trim() || "없음"],
  ];
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/professor/topics">
      <ProfessorWorkspace currentPath={`/professor/topics/${topic.id}`} role={actor.role} eyebrow={topic.programName} title={topic.title} actions={<><Link href={`/professor/topics/${topic.id}/assistants`} className="button-secondary gap-2"><ProfileIcon className="size-4 shrink-0" /><UiText>{"조교 관리"}</UiText></Link>{(topic.effectiveStatus !== "COMPLETED" && topic.effectiveStatus !== "CANCELED") || actor.role === "ADMIN" ? <Link href={`/professor/topics/${topic.id}/edit`} className="button-secondary gap-2"><EditIcon className="size-4 shrink-0" /><UiText>{"내용 편집"}</UiText></Link> : null}<TopicStatusButton topicId={topic.id} status={topic.status} pendingApplicationCount={topic.pendingApplicationCount} openRecruitmentPostCount={topic.openRecruitmentPostCount} recruitmentEnabled={topic.recruitmentEnabled} canCloseRecruitment={actor.role === "ADMIN" || topic.managerId === actor.id} isAdmin={actor.role === "ADMIN"} /></>}>
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      {showApplicationSetup
        ? <span className="muted text-sm"><UiText>{"모집 정원"}</UiText>{" "}{topic.capacity}<UiText>{"명"}</UiText></span>
        : teamSizeLabel ? <span className="muted text-sm"><UiText>{"팀 인원"}</UiText>{" "}{teamSizeLabel}</span> : null}
      <span className="muted text-sm"><UiText>{"등록자"}</UiText>{" "}{topic.authorName}</span>
    </div>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-10">
        <section aria-labelledby="managed-topic-description">
          <h2 id="managed-topic-description" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"프로젝트 설명"}</UiText></h2>
          <TranslatedText text={topic.description} className="muted mt-3 whitespace-pre-wrap leading-8" />
        </section>

        {/* 학생이 직접 프로젝트를 등록하는 프로그램에서는 주제 공고로 팀원을 모으지 않는다.
            지원 조건과 지원서 구성이 비어 있어 제목과 구분선만 남으므로 아예 감춘다. */}
        {showApplicationSetup ? (
          <>
            <section aria-labelledby="managed-topic-requirements">
              <h2 id="managed-topic-requirements" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"지원 조건"}</UiText></h2>
              <dl className="mt-3 border-t border-[var(--line)]">
                {requirementRows.map(([label, value]) => (
                  <div key={label} className="grid gap-1 border-b border-[var(--line)] py-3.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline sm:gap-4">
                    <dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt>
                    <dd className="text-sm font-semibold leading-6 text-[var(--ink)]"><UiText>{value}</UiText></dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="managed-application-form">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="managed-application-form" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"지원서 구성"}</UiText></h2>
                <StatusBadge tone="info">{applicationModeLabel[topic.applicationMode]}</StatusBadge>
              </div>
              {topic.applicationQuestions.length === 0 ? (
                <p className="muted mt-3 text-sm leading-6"><UiText>{"추가 질문 없이 지원받습니다."}</UiText></p>
              ) : (
                <ol className="mt-3 border-t border-[var(--line)]">
                  {topic.applicationQuestions.map((question, index) => (
                    <li key={question.id} className="grid gap-1 border-b border-[var(--line)] py-3.5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
                      <strong className="text-sm text-[var(--primary)]">{index + 1}</strong>
                      <span className="text-sm font-semibold leading-6"><UiText>{question.label}</UiText></span>
                      <span className="muted text-xs sm:whitespace-nowrap"><UiText>{question.required ? "필수" : "선택"}</UiText>{" · "}<UiText>{"최대"}</UiText>{" "}{question.maxLength.toLocaleString("ko-KR")}<UiText>{"자"}</UiText></span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}

        {actor.role === "ADMIN" ? <ProjectDeleteForm topicId={topic.id} title={topic.title} /> : null}
      </div>

      <aside aria-labelledby="managed-topic-schedule" className="border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <h2 id="managed-topic-schedule" className="text-lg font-bold tracking-[-0.02em]"><UiText>{"프로그램 일정"}</UiText></h2>
        <dl className="mt-3 grid gap-5">
          {topic.programRecruitmentStartsAt && topic.programRecruitmentEndsAt
            ? <Period label="모집 기간" start={topic.programRecruitmentStartsAt} end={topic.programRecruitmentEndsAt} />
            : null}
          <Period label="수행 기간" start={topic.programExecutionStartsAt} end={topic.programExecutionEndsAt} />
        </dl>
      </aside>
    </div>
      </ProfessorWorkspace>
    </AppShell>
  );
}

function Period({ label, start, end }: { label: string; start: Date; end: Date }) { return <div><dt className="muted text-xs"><UiText>{label}</UiText></dt><dd className="mt-1 text-sm font-semibold"><time dateTime={start.toISOString()}><UiDate value={start} mode="dateTime" /></time><span className="muted mx-1">–</span><time dateTime={end.toISOString()}><UiDate value={end} mode="dateTime" /></time></dd></div>; }
