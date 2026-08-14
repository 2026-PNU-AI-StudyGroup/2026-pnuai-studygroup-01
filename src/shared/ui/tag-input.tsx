"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useI18n } from "@/shared/i18n/i18n-provider";
import styles from "@/shared/ui/tag-input.module.css";

type TagInputProps = {
  id?: string;
  name: string;
  ariaLabel: string;
  defaultValue?: string[];
  value?: string[];
  onValuesChange?: (tags: string[]) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  onValueChange?: (values: string[]) => void;
};

export function TagInput({
  id,
  name,
  ariaLabel,
  defaultValue = [],
  value: controlledValue,
  onValuesChange,
  placeholder = "입력 후 Enter",
  required,
  maxLength,
  onValueChange,
}: TagInputProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const composingRef = useRef(false);
  const [uncontrolledTags, setUncontrolledTags] = useState(() => normalizeTags(defaultValue));
  const [draft, setDraft] = useState("");
  const controlled = controlledValue !== undefined;
  const tags = controlled ? normalizeTags(controlledValue) : uncontrolledTags;
  const submittedValue = [...tags, draft.trim()].filter(Boolean).join(", ");
  useEffect(() => {
    onValueChange?.(normalizeTags([...tags, ...splitTags(draft)]));
  }, [draft, onValueChange, tags]);

  function updateTags(nextTags: string[]) {
    if (!controlled) setUncontrolledTags(nextTags);
    onValuesChange?.(nextTags);
  }

  function addTags(candidates: string[]) {
    const next = normalizeTags([...tags, ...candidates]);
    updateTags(next);
    setDraft("");
  }

  function commitDraft() {
    if (draft.trim()) addTags(splitTags(draft));
  }

  return (
    <div className={styles.root} onClick={(event) => event.currentTarget.querySelector<HTMLInputElement>("input[type='text']")?.focus()}>
      <input type="hidden" name={name} value={submittedValue} />
      {tags.map((tag) => (
        <span key={tag.toLocaleLowerCase()} className={styles.chip}>
          {tag}
          <button
            type="button"
            aria-label={t(`${tag} 삭제`)}
            onClick={(event) => {
              event.stopPropagation();
              updateTags(tags.filter((candidate) => candidate !== tag));
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>
          </button>
        </span>
      ))}
      <input
        id={inputId}
        type="text"
        aria-label={t(ariaLabel)}
        className={styles.draft}
        value={draft}
        placeholder={tags.length ? "" : t(placeholder)}
        required={required && tags.length === 0}
        maxLength={maxLength}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => { composingRef.current = false; }}
        onChange={(event) => {
          const next = event.target.value;
          if (/[,;\n]/.test(next)) addTags(splitTags(next));
          else setDraft(next);
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === "Enter" || event.key === "," || event.key === ";") {
            event.preventDefault();
            commitDraft();
          } else if (event.key === "Backspace" && !draft && tags.length) {
            updateTags(tags.slice(0, -1));
          }
        }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (/[,;\n]/.test(pasted)) {
            event.preventDefault();
            addTags(splitTags(pasted));
          }
        }}
      />
    </div>
  );
}

function splitTags(value: string) {
  return value.split(/[,;\n]/).map((tag) => tag.trim()).filter(Boolean);
}

function normalizeTags(values: string[]) {
  const seen = new Set<string>();
  return values.map((tag) => tag.trim()).filter((tag) => {
    if (!tag) return false;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
