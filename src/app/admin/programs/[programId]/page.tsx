import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramIconForm } from "@/app/admin/programs/_components/program-icon-picker";
import { ProgramPolicyForm } from "@/app/admin/programs/_components/program-policy-form";
import { ProgramStatusForm } from "@/app/admin/programs/_components/program-status-form";
import { StudentProjectCreationForm } from "@/app/admin/programs/_components/student-project-creation-form";
import { ProgramVoteResults } from "@/app/admin/programs/_components/program-vote-results";
import { ProgramReportRequirementForm } from "@/app/admin/programs/_components/program-report-requirement-form";
import { ProgramAdvisorPanel } from "@/app/admin/programs/_components/program-advisor-panel";
import { advisorScoreMatrix, listProgramAdvisors, listProgramTopicsForAssignment } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";
import { RubricManager, type RubricDivisionRow, type RubricRow } from "@/app/admin/programs/[programId]/rubric/_components/rubric-manager";
import { TrackManager, type TrackRow } from "@/app/admin/programs/[programId]/tracks/_components/track-manager";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { listProgramCategories } from "@/app/admin/programs/_lib/program-categories";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { FormSection } from "@/shared/ui/form-system";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";

const TABS = [
  { key: "settings", label: "설정" },
  { key: "rubric", label: "채점표" },
  { key: "tracks", label: "분과" },
  { key: "reports", label: "보고서" },
  { key: "votes", label: "투표" },
  { key: "advisors", label: "자문위원" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function ProgramDetailPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const { programId } = await params;
  const rawTab = (await searchParams).tab;
  const tab: TabKey = TABS.some((entry) => entry.key === rawTab) ? (rawTab as TabKey) : "settings";

  let program;
  try {
    program = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).getSettings(actor, programId);
  } catch {
    notFound();
  }
  const base = `/admin/programs/${program.id}`;
  const lifecycleStatus = program.lifecycleStatus ?? (program.status === "CLOSED" ? "CLOSED" : "ACTIVE");

  let content: React.ReactNode = null;
  if (tab === "settings") {
    const categoryOptions = await listProgramCategories();
    content = (
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
          <div className="grid gap-4">
            <ProgramPolicyForm
              programId={program.id}
              name={program.name}
              category={program.category}
              categoryOptions={categoryOptions}
              description={program.description}
              startsAt={program.startsAt}
              endsAt={program.endsAt}
              advisorEnabled={program.advisorEnabled}
              registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt}
              registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt}
              recruitmentStartsAt={program.recruitmentStartsAt}
              recruitmentEndsAt={program.recruitmentEndsAt}
              executionStartsAt={program.executionStartsAt}
              executionEndsAt={program.executionEndsAt}
              submissionStartsAt={program.submissionStartsAt}
              submissionEndsAt={program.submissionEndsAt}
              votingPolicy={program.votingPolicy ?? null}
              divisionCount={program.divisions?.length ?? 0}
            />
          </div>
          <UiAside aria-label="보조 운영 설정" className="grid gap-4">
            <StudentProjectCreationForm id={program.id} enabled={program.studentProjectCreationEnabled} disabled={lifecycleStatus === "CLOSED"} />
            <ProgramIconForm id={program.id} icon={program.icon} />
          </UiAside>
        </div>
        <ProgramStatusForm id={program.id} isPublic={program.isPublic === true} lifecycleStatus={lifecycleStatus} />
      </div>
    );
  } else if (tab === "rubric") {
    const [divisionRecords, rubricRecords] = await Promise.all([
      prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, rubricMode: true } }),
      prisma.rubricDefinition.findMany({
        where: { programId: program.id, archivedAt: null, legacy: false },
        orderBy: [{ divisionId: "asc" }, { position: "asc" }],
        select: {
          id: true,
          divisionId: true,
          title: true,
          gradingDueAt: true,
          audience: true,
          criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } },
          evaluations: { select: { _count: { select: { scores: true } } } },
        },
      }),
    ]);
    const divisions: RubricDivisionRow[] = divisionRecords;
    const rubrics: RubricRow[] = rubricRecords.map(({ evaluations, ...rubric }) => ({
      ...rubric,
      scoreCount: evaluations.reduce((sum, evaluation) => sum + evaluation._count.scores, 0),
    }));
    content = (
      <FormSection title="채점표" description="보고서와 별개인 팀 평가를 공통 또는 분과 전용으로 여러 개 구성하고 채점 마감과 공개 대상을 관리합니다.">
        <RubricManager programId={program.id} divisions={divisions} rubrics={rubrics} />
      </FormSection>
    );
  } else if (tab === "tracks") {
    const divisions = await prisma.programDivision.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, _count: { select: { topics: true } } } });
    const rows: TrackRow[] = divisions.map((division) => ({ id: division.id, name: division.name, projectCount: division._count.topics }));
    content = (
      <FormSection title="분과" description="분과가 하나 이상이면 새 프로젝트는 반드시 하나의 분과를 선택합니다.">
        <TrackManager programId={program.id} tracks={rows} />
      </FormSection>
    );
  } else if (tab === "reports") {
    const records = await prisma.programReportDefinition.findMany({
      where: { programId: program.id, archivedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, title: true, dueAt: true, reports: { select: { _count: { select: { versions: true } } } } },
    });
    const definitions = records.map(({ reports, ...definition }) => ({
      ...definition,
      versionCount: reports.reduce((sum, report) => sum + report._count.versions, 0),
    }));
    content = (
      <FormSection title="보고서" description="제출 보고서의 제목, 마감, 순서를 관리합니다. 새 보고서는 진행 중인 팀과 이후 생성되는 팀에 자동 할당됩니다.">
        <ProgramReportRequirementForm programId={program.id} definitions={definitions} />
      </FormSection>
    );
  } else if (tab === "advisors") {
    const [advisors, topics, matrix] = await Promise.all([
      listProgramAdvisors(prisma, program.id),
      listProgramTopicsForAssignment(prisma, program.id),
      advisorScoreMatrix(prisma, program.id),
    ]);
    content = <ProgramAdvisorPanel programId={program.id} advisors={advisors} topics={topics} matrix={matrix} />;
  } else {
    const refreshedAt = new Date();
    const votingResults = program.votingPolicy
      ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshedAt).getResults(actor, program.id)
      : null;
    content = votingResults ? (
      <FormSection title="득표현황" description="투표 설정을 조정한 뒤 같은 화면에서 현재 집계와 최종 결과를 확인합니다.">
        <ProgramVoteResults
          results={votingResults}
          refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshedAt)}
          policySettingsHref={`${base}#voting-policy`}
        />
      </FormSection>
    ) : (
      <EmptyState
        title="투표 정책이 없는 프로그램입니다"
        description="투표 기간과 인당 가능 투표수를 설정하면 이 화면에서 현황을 확인할 수 있습니다."
        action={<Link href={`${base}#voting-policy`} className="button-primary"><UiText>{"투표 정책 설정"}</UiText></Link>}
      />
    );
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={base}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="한 프로그램의 등록·투표·채점·분과·제출물 요건을 탭에서 관리합니다."
        actions={<><Link href={`/announcements/new?target=program:${program.id}`} className="button-secondary"><UiText>{"공지 작성"}</UiText></Link><Link href="/admin/programs" className="button-secondary"><UiText>{"프로그램 목록"}</UiText></Link></>}
      >
        <UiNav aria-label="프로그램 설정 탭" className="flex flex-wrap gap-1 border-b border-[var(--line)]">
          {TABS.map((entry) => {
            const active = entry.key === tab;
            return (
              <Link
                key={entry.key}
                href={entry.key === "settings" ? base : `${base}?tab=${entry.key}`}
                aria-current={active ? "page" : undefined}
                className={`relative -mb-px px-4 py-2.5 text-sm font-semibold ${active ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                <UiText>{entry.label}</UiText>
              </Link>
            );
          })}
        </UiNav>
        <div className="pt-6">{content}</div>
      </AdminWorkspace>
    </AppShell>
  );
}
