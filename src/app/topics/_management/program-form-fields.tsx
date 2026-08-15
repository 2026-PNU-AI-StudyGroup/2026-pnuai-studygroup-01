"use client";

import { UiDiv, UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import styles from "@/app/topics/_management/program-form.module.css";
import { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";
import { ChoiceCard, DateTimeInput } from "@/shared/ui/form-system";

export type ProgramVisibility = "PRIVATE" | "PUBLIC";

export function ProgramVisibilitySettings({ value, onValueChange }: {
  value: ProgramVisibility;
  onValueChange: (value: ProgramVisibility) => void;
}) {
  return (
    <fieldset className={`${styles.radioGroup} ${styles.fullRow}`}>
      <legend><UiText>{"공개 설정"}</UiText></legend>
      <ChoiceCard variant="inline" name="visibility" value="PRIVATE" checked={value === "PRIVATE"} onChange={() => onValueChange("PRIVATE")} required label="비공개" />
      <ChoiceCard variant="inline" name="visibility" value="PUBLIC" checked={value === "PUBLIC"} onChange={() => onValueChange("PUBLIC")} required label="전체 공개" />
    </fieldset>
  );
}

export function ProgramTeamSizeRange({ studentProjectCreationEnabled, teamMinSize, teamMaxSize, onTeamMinSizeChange, onTeamMaxSizeChange }: {
  studentProjectCreationEnabled: boolean;
  teamMinSize: number;
  teamMaxSize: number;
  onTeamMinSizeChange: (value: number) => void;
  onTeamMaxSizeChange: (value: number) => void;
}) {
  const updateMin = (value: number) => onTeamMinSizeChange(Math.min(teamMaxSize, Math.max(1, value)));
  const updateMax = (value: number) => onTeamMaxSizeChange(Math.max(studentProjectCreationEnabled ? teamMinSize : 1, Math.min(100, value)));
  return (
    <UiDiv className={styles.teamSizeRange} role="group" aria-label="팀 인원">
      {studentProjectCreationEnabled ? <>
        <UiInput id="project-team-min-size" name="projectTeamMinSize" type="number" min={1} max={teamMaxSize} value={teamMinSize} onChange={(event) => updateMin(Number(event.target.value))} aria-label="팀 최소 인원" required className={`form-control ${styles.teamSizeInput}`} />
        <span aria-hidden="true">~</span>
      </> : <><input type="hidden" name="projectTeamMinSize" value="2" /><span className={styles.teamSizePrefix}><UiText>{"최대"}</UiText></span></>}
      <UiInput id="project-team-max-size" name="projectTeamMaxSize" type="number" min={studentProjectCreationEnabled ? teamMinSize : 1} max={100} value={teamMaxSize} onChange={(event) => updateMax(Number(event.target.value))} aria-label="팀 최대 인원" required className={`form-control ${styles.teamSizeInput}`} />
      <span aria-hidden="true"><UiText>{"명"}</UiText></span>
    </UiDiv>
  );
}

export function ProgramPeriodRow({ label, fieldLabel = label.replace(" 기간", ""), emphasis = false, startId, startName, endId, endName, startValue, endValue }: {
  label: string;
  fieldLabel?: string;
  emphasis?: boolean;
  startId: string;
  startName: string;
  endId: string;
  endName: string;
  startValue?: Date;
  endValue?: Date;
}) {
  return (
    <div className={`${styles.periodRow}${emphasis ? ` ${styles.primaryRow}` : ""}`}>
      <strong className={`${styles.periodTitle}${emphasis ? ` ${styles.primaryTitle}` : ""}`}><UiText>{label}</UiText></strong>
      <div className={styles.periodInputs}>
        <span className={`${styles.periodLabel} ${styles.startLabel}`}><UiText>{"시작"}</UiText></span>
        <div className={styles.startControl}>
          <DateTimeInput id={startId} name={startName} defaultValue={startValue ? koreanDateTimeInput(startValue) : ""} aria-label={`${fieldLabel} 시작`} required />
        </div>
        <span className={styles.periodSeparator} aria-hidden="true">~</span>
        <span className={`${styles.periodLabel} ${styles.endLabel}`}><UiText>{"종료"}</UiText></span>
        <div className={styles.endControl}>
          <DateTimeInput id={endId} name={endName} defaultValue={endValue ? koreanDateTimeInput(endValue) : ""} aria-label={`${fieldLabel} 종료`} required />
        </div>
      </div>
    </div>
  );
}
