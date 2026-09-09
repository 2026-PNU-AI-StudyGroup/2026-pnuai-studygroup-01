"use client";

import { UiDiv } from "@/modules/translation/ui/localized-elements";
import { PROGRAM_ICON_KEYS, PROGRAM_ICON_LABEL, type ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { ChoiceCard } from "@/shared/ui/form-system";
import { ProgramIcon } from "@/shared/ui/program-icon";

/**
 * 프로그램 아이콘 고르기.
 *
 * 예전에는 만들기 폼이 FOLDER 를 숨은 값으로 박아 넣고 고칠 자리도 없었다. 그래서 손으로
 * 만든 프로그램이 전부 같은 아이콘이었다. 사이드바와 대표 이미지 없는 프로젝트 표지가 이
 * 값을 쓰는데 다 같으면 훑을 때 구분이 안 된다.
 */
export function ProgramIconSelect({ defaultValue = "FOLDER" }: { defaultValue?: ProgramIconKey }) {
  return (
    <UiDiv
      role="radiogroup"
      aria-label="프로그램 아이콘"
      className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2"
    >
      {PROGRAM_ICON_KEYS.map((icon) => (
        <ChoiceCard
          key={icon}
          variant="icon"
          density="compact"
          name="icon"
          value={icon}
          defaultChecked={icon === defaultValue}
          label={PROGRAM_ICON_LABEL[icon]}
          visual={<ProgramIcon icon={icon} className="size-5" />}
        />
      ))}
    </UiDiv>
  );
}
