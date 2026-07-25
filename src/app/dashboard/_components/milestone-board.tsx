import Link from "next/link";

import {
  koreanDate,
  milestoneLanes,
  projectStatus,
} from "@/app/dashboard/_components/project-list-model";
import styles from "@/app/dashboard/_components/project-list.module.css";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";

function MilestoneCard({
  milestone,
  selected,
  onSelect,
}: {
  milestone: TeamListItem["milestones"][number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.milestoneCard}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <strong>{milestone.title}</strong>
      <span className={styles.cardMeta}>
        <span>{milestone.assignees.map(({ name }) => name).join(", ") || "담당자 미정"}</span>
        <time dateTime={milestone.dueAt.toISOString()}>
          {koreanDate.format(milestone.dueAt)}
        </time>
      </span>
    </button>
  );
}

export function MilestoneBoard({
  team,
  selectedMilestoneId,
  onSelectMilestone,
}: {
  team: TeamListItem;
  selectedMilestoneId: string;
  onSelectMilestone: (milestoneId: string) => void;
}) {
  return (
    <section className={styles.board} aria-labelledby={`board-${team.id}-title`}>
      <header className={styles.boardHeading}>
        <div>
          <span>{projectStatus[team.status]}</span>
          <h2 id={`board-${team.id}-title`}>{team.name}</h2>
          <p>{team.topicTitle}</p>
        </div>
        <Link href={`/teams/${team.id}/milestones`} className="button-secondary">
          마일스톤 관리
        </Link>
      </header>

      {team.milestones.length === 0 ? (
        <div className={styles.boardEmpty}>
          <strong>아직 마일스톤이 없습니다</strong>
          <p>첫 목표와 완료 예정일을 정하면 작업 보드에 표시됩니다.</p>
        </div>
      ) : (
        <div className={styles.lanes}>
          {milestoneLanes.map((lane) => {
            const milestones = team.milestones.filter(
              ({ status }) => status === lane.status,
            );
            return (
              <section
                key={lane.status}
                className={styles.lane}
                aria-labelledby={`lane-${team.id}-${lane.status}`}
              >
                <header className={styles.laneHeading}>
                  <div>
                    <h3 id={`lane-${team.id}-${lane.status}`}>{lane.label}</h3>
                    <p>{lane.description}</p>
                  </div>
                  <span>{milestones.length}</span>
                </header>
                <div className={styles.laneCards}>
                  {milestones.length ? (
                    milestones.map((milestone) => (
                      <MilestoneCard
                        key={milestone.id}
                        milestone={milestone}
                        selected={milestone.id === selectedMilestoneId}
                        onSelect={() => onSelectMilestone(milestone.id)}
                      />
                    ))
                  ) : (
                    <p className={styles.emptyLaneMessage}>해당 작업 없음</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
