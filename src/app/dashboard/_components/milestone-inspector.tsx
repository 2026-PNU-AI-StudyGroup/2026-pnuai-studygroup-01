import Link from "next/link";

import {
  koreanDate,
  milestoneLanes,
} from "@/app/dashboard/_components/project-list-model";
import styles from "@/app/dashboard/_components/project-list.module.css";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";

export function MilestoneInspector({
  role,
  team,
  milestone,
}: {
  role: UserRole;
  team: TeamListItem;
  milestone: TeamListItem["milestones"][number] | undefined;
}) {
  const lane = milestoneLanes.find(({ status }) => status === milestone?.status);

  return (
    <aside className={styles.inspector} aria-label="선택한 마일스톤 상세">
      <div>
        <span className={styles.inspectorEyebrow}>선택한 작업</span>
        {milestone ? (
          <>
            <span className={styles.inspectorStatus}>{lane?.label}</span>
            <h2>{milestone.title}</h2>
            <dl className={styles.inspectorFacts}>
              <div>
                <dt>담당자</dt>
                <dd>{milestone.assignees.map(({ name }) => name).join(", ") || "미정"}</dd>
              </div>
              <div>
                <dt>완료 예정</dt>
                <dd>
                  <time dateTime={milestone.dueAt.toISOString()}>
                    {koreanDate.format(milestone.dueAt)}
                  </time>
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <h2>마일스톤을 준비 중입니다</h2>
            <p className={styles.inspectorEmpty}>
              팀에서 첫 마일스톤을 만들면 담당자와 기한을 확인할 수 있습니다.
            </p>
          </>
        )}
      </div>

      <nav className={styles.quickLinks} aria-label={`${team.name} 작업 바로가기`}>
        <Link href={`/teams/${team.id}/milestones`}>
          <span>마일스톤</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link href={`/teams/${team.id}/discussion`}>
          <span>{role === "PROFESSOR" ? "지도 의견" : "팀 대화"}</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link href={`/teams/${team.id}/reports`}>
          <span>{role === "PROFESSOR" ? "보고서 관리" : "보고서"}</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link href={`/teams/${team.id}/artifacts`}>
          <span>결과물</span>
          <span aria-hidden="true">→</span>
        </Link>
      </nav>

      <Link href={`/teams/${team.id}`} className="button-primary w-full">
        프로젝트 개요
      </Link>
    </aside>
  );
}
