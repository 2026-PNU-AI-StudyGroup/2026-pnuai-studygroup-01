"use client";

import { useState } from "react";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { CustomSelect } from "@/shared/ui/custom-select";

const NEW_CATEGORY = "__NEW_CATEGORY__";

// 프로그램 분류(대분류)를 자유 텍스트 대신 드롭다운으로 고른다.
// 목록은 기존 프로그램에서 실제 쓰인 분류(중복 제거)이며, "새 분류 추가"로 목록에 없는 값을 직접 넣을 수 있다.
// 새로 입력한 분류는 프로그램에 저장되어 다음부터 드롭다운에 나타난다.
export function CategorySelect({ options, defaultValue = "" }: { options: string[]; defaultValue?: string }) {
  const isKnown = defaultValue !== "" && options.includes(defaultValue);
  const [selected, setSelected] = useState(isKnown ? defaultValue : defaultValue ? NEW_CATEGORY : "");
  const [custom, setCustom] = useState(isKnown ? "" : defaultValue);
  const resolved = selected === NEW_CATEGORY ? custom.trim() : selected;
  return (
    <div className="grid gap-2">
      <CustomSelect
        id="program-category"
        name="categoryChoice"
        ariaLabel="프로그램 분류"
        required
        invalidMessage="분류를 선택하세요"
        value={selected}
        onValueChange={setSelected}
        placeholder="분류를 선택하세요"
        options={[
          ...options.map((option) => ({ value: option, label: option })),
          { value: NEW_CATEGORY, label: "+ 새 분류 추가" },
        ]}
      />
      {selected === NEW_CATEGORY ? (
        <UiInput
          aria-label="새 분류 이름"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          maxLength={100}
          required
          placeholder="새 분류 이름 (예: 캡스톤)"
          className="form-control"
        />
      ) : null}
      <input type="hidden" name="category" value={resolved} />
    </div>
  );
}
