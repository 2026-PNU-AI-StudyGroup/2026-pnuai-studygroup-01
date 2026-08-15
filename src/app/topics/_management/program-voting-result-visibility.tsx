"use client";

import { useState } from "react";

import styles from "@/app/topics/_management/program-voting-result-visibility.module.css";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiDiv } from "@/modules/translation/ui/localized-elements";

export function ProgramVotingResultVisibilityFields({
  defaultDuringVoting = false,
  defaultAfterVoting = true,
  disabled = false,
}: {
  defaultDuringVoting?: boolean;
  defaultAfterVoting?: boolean;
  disabled?: boolean;
}) {
  const [duringVoting, setDuringVoting] = useState(defaultDuringVoting);
  const [afterVoting, setAfterVoting] = useState(defaultAfterVoting);

  return (
    <UiDiv className={styles.root} role="group" aria-label="투표 결과 공개 설정" aria-disabled={disabled || undefined}>
      <input type="hidden" name="resultsVisibleDuringVoting" value={String(duringVoting)} disabled={disabled} />
      <input type="hidden" name="resultsVisibleAfterVoting" value={String(afterVoting)} disabled={disabled} />
      <strong><UiText>{"결과 공개"}</UiText></strong>
      <VisibilityButton label="투표 중 결과 공개" pressed={duringVoting} disabled={disabled} onClick={() => setDuringVoting((current) => !current)} />
      <VisibilityButton label="투표 마감 후 결과 공개" pressed={afterVoting} disabled={disabled} onClick={() => setAfterVoting((current) => !current)} />
    </UiDiv>
  );
}

function VisibilityButton({ label, pressed, disabled, onClick }: {
  label: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const stateLabel = pressed ? "공개" : "비공개";
  return (
    <button type="button" aria-label={`${label}: ${stateLabel}`} aria-pressed={pressed} disabled={disabled} className={styles.button} onClick={onClick}>
      <UiText>{label}</UiText>
      <span><UiText>{stateLabel}</UiText></span>
    </button>
  );
}
