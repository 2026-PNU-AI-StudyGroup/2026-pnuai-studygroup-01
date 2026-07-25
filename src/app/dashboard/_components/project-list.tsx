"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MilestoneBoard } from "@/app/dashboard/_components/milestone-board";
import { MilestoneInspector } from "@/app/dashboard/_components/milestone-inspector";
import {
  defaultMilestoneId,
  projectStatus,
} from "@/app/dashboard/_components/project-list-model";
import styles from "@/app/dashboard/_components/project-list.module.css";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";

function ProjectStrip({
  teams,
  selectedId,
  onSelect,
}: {
  teams: TeamListItem[];
  selectedId: string;
  onSelect: (team: TeamListItem) => void;
}) {
  return (
    <section aria-labelledby="active-projects-title">
      <div className={styles.sectionHeading}>
        <h2 id="active-projects-title">진행 중 프로젝트</h2>
        <span>{teams.length}개</span>
      </div>
      <div className={styles.projectStrip}>
        {teams.map((team) => {
          const selected = team.id === selectedId;
          return (
            <button
              key={team.id}
              type="button"
              className={styles.projectTab}
              aria-label={team.name}
              aria-pressed={selected}
              onClick={() => onSelect(team)}
            >
              <span className={styles.projectTabStatus}>
                {projectStatus[team.status]}
              </span>
              <strong>{team.name}</strong>
              <span className={styles.projectTabTopic}>{team.topicTitle}</span>
              <span className={styles.projectTabMeta}>
                마일스톤 {team.completedMilestoneCount}/{team.milestoneCount}
                <i aria-hidden="true" />
                팀원 {team.memberCount}명
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CompletedProjectRows({
  teams,
}: {
  teams: TeamListItem[];
}) {
  if (teams.length === 0) return null;

  return (
    <section className={styles.completed} aria-labelledby="completed-projects-title">
      <div className={styles.sectionHeading}>
        <h2 id="completed-projects-title">완료한 프로젝트</h2>
        <span>{teams.length}개</span>
      </div>
      <ul className={styles.completedRows}>
        {teams.map((team) => (
          <li key={team.id}>
            <div>
              <strong>{team.name}</strong>
              <span>{team.topicTitle}</span>
            </div>
            <span>팀원 {team.memberCount}명</span>
            <Link href={`/teams/${team.id}`}>프로젝트 보기</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProjectList({ role, teams }: { role: UserRole; teams: TeamListItem[] }) {
  const activeTeams = useMemo(
    () => teams.filter((team) => team.status !== "CLOSED"),
    [teams],
  );
  const closedTeams = useMemo(
    () => teams.filter((team) => team.status === "CLOSED"),
    [teams],
  );
  const [selectedProjectId, setSelectedProjectId] = useState(
    activeTeams[0]?.id ?? "",
  );
  const selectedTeam =
    activeTeams.find(({ id }) => id === selectedProjectId) ?? activeTeams[0];
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(
    defaultMilestoneId(selectedTeam),
  );
  const selectedMilestone =
    selectedTeam?.milestones.find(({ id }) => id === selectedMilestoneId) ??
    selectedTeam?.milestones.find(({ status }) => status === "IN_PROGRESS") ??
    selectedTeam?.milestones.find(({ status }) => status === "TODO") ??
    selectedTeam?.milestones[0];

  function selectProject(team: TeamListItem) {
    setSelectedProjectId(team.id);
    setSelectedMilestoneId(defaultMilestoneId(team));
  }

  return (
    <div className={styles.projectSections}>
      {selectedTeam ? (
        <>
          {activeTeams.length > 1 ? (
            <ProjectStrip
              teams={activeTeams}
              selectedId={selectedTeam.id}
              onSelect={selectProject}
            />
          ) : null}
          <div className={styles.workspaceGrid}>
            <MilestoneBoard
              team={selectedTeam}
              selectedMilestoneId={selectedMilestone?.id ?? ""}
              onSelectMilestone={setSelectedMilestoneId}
            />
            <MilestoneInspector
              role={role}
              team={selectedTeam}
              milestone={selectedMilestone}
            />
          </div>
        </>
      ) : null}
      <CompletedProjectRows teams={closedTeams} />
    </div>
  );
}
