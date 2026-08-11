import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgramIconForm } from "@/app/admin/programs/_components/program-icon-picker";
import { ProgramPolicyForm } from "@/app/admin/programs/_components/program-policy-form";
import { ProgramStatusForm } from "@/app/admin/programs/_components/program-status-form";
import { StudentProjectCreationForm } from "@/app/admin/programs/_components/student-project-creation-form";
import { ProgramVoteResults } from "@/app/admin/programs/_components/program-vote-results";
import { ProgramReportRequirementForm } from "@/app/admin/programs/_components/program-report-requirement-form";
import { RubricManager, type CriterionRow } from "@/app/admin/programs/[programId]/rubric/_components/rubric-manager";
import { TrackManager, type TrackRow } from "@/app/admin/programs/[programId]/tracks/_components/track-manager";
import { AdminWorkspace } from "@/app/_components/admin-workspace";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiAside, UiNav } from "@/modules/translation/ui/localized-elements";
import { FormSection } from "@/shared/ui/form-system";
import { prisma } from "@/shared/infrastructure/database/prisma";

const TABS = [
  { key: "settings", label: "설정" },
  { key: "rubric", label: "채점표" },
  { key: "tracks", label: "트랙" },
  { key: "reports", label: "제출물 요건" },
  { key: "votes", label: "투표" },
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

  let content: React.ReactNode = null;
  if (tab === "settings") {
    content = (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="grid gap-4">
          <ProgramPolicyForm
            programId={program.id}
            registrationStartsAt={program.projectRegistrationStartsAt ?? program.startsAt}
            registrationEndsAt={program.projectRegistrationEndsAt ?? program.endsAt}
            recruitmentEndsAt={program.recruitmentEndsAt}
            votingPolicy={program.votingPolicy ?? null}
          />
          <ProgramStatusForm id={program.id} status={program.status} />
        </div>
        <UiAside aria-label="보조 운영 설정" className="grid gap-4">
          <StudentProjectCreationForm id={program.id} enabled={program.studentProjectCreationEnabled} disabled={program.status === "CLOSED"} />
          <ProgramIconForm id={program.id} icon={program.icon} />
        </UiAside>
      </div>
    );
  } else if (tab === "rubric") {
    const criteria = await prisma.rubricCriterion.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } });
    const rows: CriterionRow[] = criteria.map((criterion) => ({ id: criterion.id, label: criterion.label, maxPoints: criterion.maxPoints }));
    content = (
      <FormSection title="채점표(루브릭)" description="항목과 배점을 정하면, 보고서 화면에서 항목별 점수를 입력하고 합산 결과를 학생에게 공개할 수 있습니다.">
        <RubricManager programId={program.id} criteria={rows} />
      </FormSection>
    );
  } else if (tab === "tracks") {
    const tracks = await prisma.programTrack.findMany({ where: { programId: program.id }, orderBy: { position: "asc" }, select: { id: true, name: true, _count: { select: { topics: true } } } });
    const rows: TrackRow[] = tracks.map((track) => ({ id: track.id, name: track.name, topicCount: track._count.topics }));
    content = (
      <FormSection title="트랙(소분류)" description="관리자가 대분류(프로그램) 아래 세부 트랙을 만들면, 주제를 트랙별로 나눌 수 있습니다.">
        <TrackManager programId={program.id} tracks={rows} />
      </FormSection>
    );
  } else if (tab === "reports") {
    const teamCount = await prisma.team.count({ where: { programId: program.id, status: { not: "CLOSED" } } });
    content = (
      <FormSection title="제출물 요건" description="체크한 보고서를 프로그램의 모든 팀에 요구로 지정하고 마감을 설정합니다. 팀별 화면에서 개별 조정도 가능합니다.">
        <ProgramReportRequirementForm programId={program.id} teamCount={teamCount} />
      </FormSection>
    );
  } else {
    const refreshed = new Date();
    const votingResults = program.votingPolicy
      ? await new ProjectVotingService(new PrismaProjectVotingRepository(prisma), () => refreshed).getResults(actor, program.id)
      : null;
    content = votingResults ? (
      <FormSection title="득표현황" description="투표 설정을 조정한 뒤 같은 화면에서 현재 집계와 최종 결과를 확인합니다.">
        <ProgramVoteResults results={votingResults} refreshedAt={new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(refreshed)} />
      </FormSection>
    ) : (
      <p className="text-sm text-[var(--muted)]"><UiText>{"이 프로그램에는 투표 설정이 없습니다. 설정 탭에서 투표를 켜면 집계가 표시됩니다."}</UiText></p>
    );
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={base}>
      <AdminWorkspace
        currentPath="/admin/programs"
        eyebrow="프로그램 관리"
        title={program.name}
        description="한 프로그램의 등록·투표·채점·트랙·제출물 요건을 탭에서 관리합니다."
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
