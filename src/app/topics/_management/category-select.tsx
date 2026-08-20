"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { renameProgramCategoryAction } from "@/app/topics/_management/program-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton, UiInput } from "@/modules/translation/ui/localized-elements";
import { CustomSelect } from "@/shared/ui/custom-select";
import { EditIcon } from "@/shared/ui/workspace-icons";

const NEW_CATEGORY = "__NEW_CATEGORY__";

// 프로그램 분류(대분류)를 자유 텍스트 대신 드롭다운으로 고른다.
// 목록은 기존 프로그램에서 실제 쓰인 분류(중복 제거)이며, "새 분류 추가"로 목록에 없는 값을 직접 넣을 수 있다.
// 새로 입력한 분류는 프로그램에 저장되어 다음부터 드롭다운에 나타난다.
export function CategorySelect({ options, defaultValue = "", canRename = false }: {
  options: string[];
  defaultValue?: string;
  canRename?: boolean;
}) {
  const isKnown = defaultValue !== "" && options.includes(defaultValue);
  const [selected, setSelected] = useState(isKnown ? defaultValue : defaultValue ? NEW_CATEGORY : "");
  const [custom, setCustom] = useState(isKnown ? "" : defaultValue);
  const resolved = selected === NEW_CATEGORY ? custom.trim() : selected;
  const router = useRouter();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameMessage, setRenameMessage] = useState<{ status: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // 고른 분류가 실제로 쓰이고 있을 때만 이름을 바꿀 수 있다. 새로 입력하는 값은 아직 바꿀 것이 없다.
  const renameTarget = canRename && selected !== NEW_CATEGORY && options.includes(selected) ? selected : null;

  function submitRename(from: string, to: string) {
    setRenameMessage(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("from", from);
      data.set("to", to);
      const result = await renameProgramCategoryAction(data);
      setRenameMessage(result);
      if (result.status !== "success") return;
      setRenaming(null);
      setSelected(to);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <CustomSelect
            id="program-category"
            ariaLabel="프로그램 분류"
            required
            invalidMessage="분류를 선택하세요"
            value={selected}
            onValueChange={(next) => {
              setSelected(next);
              setRenaming(null);
              setRenameMessage(null);
            }}
            hideSelectedOption
            placeholder="분류를 선택하세요"
            options={[
              ...options.map((option) => ({ value: option, label: option })),
              { value: NEW_CATEGORY, label: "+ 새 분류 추가" },
            ]}
          />
        </div>
        {renameTarget && renaming === null ? (
          <UiButton
            type="button"
            aria-label="분류 이름 바꾸기"
            title="분류 이름 바꾸기"
            className="button-quiet button-compact shrink-0 px-2"
            onClick={() => {
              setRenaming(renameTarget);
              setRenameMessage(null);
            }}
          >
            <EditIcon className="size-4" />
          </UiButton>
        ) : null}
      </div>

      {renaming !== null ? (
        <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-3">
          <p className="text-[0.8125rem] leading-5 text-[var(--muted)]">
            <UiText>{"이 분류를 쓰는 모든 프로그램의 이름이 함께 바뀝니다. 이미 있는 이름을 넣으면 두 분류가 합쳐집니다."}</UiText>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <UiInput
              aria-label="바꿀 분류 이름"
              className="form-control h-9 w-56 py-1 text-sm"
              value={renaming}
              maxLength={100}
              onChange={(event) => setRenaming(event.target.value)}
            />
            <button
              type="button"
              className="button-secondary button-compact"
              disabled={pending || renaming.trim().length === 0}
              onClick={() => submitRename(renameTarget ?? selected, renaming.trim())}
            >
              <UiText>{pending ? "저장 중" : "이름 변경"}</UiText>
            </button>
            <button type="button" className="button-quiet button-compact" disabled={pending} onClick={() => setRenaming(null)}>
              <UiText>{"취소"}</UiText>
            </button>
          </div>
        </div>
      ) : null}

      {renameMessage?.message ? (
        <p
          aria-live="polite"
          role={renameMessage.status === "error" ? "alert" : undefined}
          className={`text-[0.8125rem] font-semibold ${renameMessage.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          <UiText>{renameMessage.message}</UiText>
        </p>
      ) : null}

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
