"use client";

import { useState } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiDiv } from "@/modules/translation/ui/localized-elements";
import { ChoiceCard } from "@/shared/ui/form-system";
import styles from "@/app/topics/_management/program-submission-download.module.css";

export type SubmissionTeamRow = {
  id: string;
  name: string;
  projectTitle: string;
  fileCount: number;
};

export function ProgramSubmissionDownload({ programId, teams }: {
  programId: string;
  teams: SubmissionTeamRow[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const downloadable = teams.filter(({ fileCount }) => fileCount > 0);
  const selectedCount = selected.length;
  const allSelected = downloadable.length > 0 && selectedCount === downloadable.length;

  if (teams.length === 0) {
    return <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"팀이 없습니다. 프로젝트가 팀으로 확정되면 제출물을 내려받을 수 있습니다."}</UiText></p>;
  }

  function toggle(teamId: string) {
    setSelected((current) => current.includes(teamId)
      ? current.filter((value) => value !== teamId)
      : [...current, teamId]);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : downloadable.map(({ id }) => id));
  }

  function download(teamIds: string[] | null) {
    const query = teamIds ? `?teams=${teamIds.join(",")}` : "";
    window.location.href = `/api/programs/${programId}/submissions${query}`;
  }

  return (
    <UiDiv className={styles.root}>
      <UiDiv className={styles.toolbar}>
        <ChoiceCard
          type="checkbox"
          variant="inline"
          density="compact"
          checked={allSelected}
          onChange={toggleAll}
          disabled={downloadable.length === 0}
          label="전체 선택"
          className={styles.selectAll}
        />
        <span className={styles.count}>
          {selectedCount} / {downloadable.length} <UiText>{"팀 선택"}</UiText>
        </span>
        <UiDiv className={styles.actions}>
          <button
            type="button"
            className="button-secondary button-compact min-h-8 px-3 font-medium"
            disabled={selectedCount === 0}
            onClick={() => download(selected)}
          >
            <UiText>{"선택 팀 다운로드"}</UiText>
          </button>
          <button
            type="button"
            className="button-secondary button-compact min-h-8 px-3 font-medium"
            disabled={downloadable.length === 0}
            onClick={() => download(null)}
          >
            <UiText>{"전체 다운로드"}</UiText>
          </button>
        </UiDiv>
      </UiDiv>
      <ul className={styles.list}>
        {teams.map((team) => (
          <li key={team.id} className={styles.row}>
            <ChoiceCard
              type="checkbox"
              variant="inline"
              density="compact"
              checked={selected.includes(team.id)}
              onChange={() => toggle(team.id)}
              disabled={team.fileCount === 0}
              label={team.name}
              description={team.projectTitle}
              className={styles.choice}
            />
            <span className={styles.files}>
              {team.fileCount > 0
                ? <>{team.fileCount}<UiText>{"개"}</UiText></>
                : <span className="text-[var(--muted)]">0<UiText>{"개"}</UiText></span>}
            </span>
          </li>
        ))}
      </ul>
    </UiDiv>
  );
}
