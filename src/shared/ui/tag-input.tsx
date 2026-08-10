"use client";

import { useEffect, useId, useState } from "react";

import { useI18n } from "@/shared/i18n/i18n-provider";

type TagInputProps = {
  id?: string;
  name: string;
  ariaLabel: string;
  defaultValue?: string[];
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
  placeholder = "입력 후 Enter",
  required,
  maxLength,
  onValueChange,
}: TagInputProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [tags, setTags] = useState(() => normalizeTags(defaultValue));
  const [draft, setDraft] = useState("");
  const submittedValue = [...tags, draft.trim()].filter(Boolean).join(", ");
  useEffect(() => {
    onValueChange?.(normalizeTags([...tags, ...splitTags(draft)]));
  }, [draft, onValueChange, tags]);

  function addTags(candidates: string[]) {
    const next = normalizeTags([...tags, ...candidates]);
    setTags(next);
    setDraft("");
  }

  function commitDraft() {
    if (draft.trim()) addTags(splitTags(draft));
  }

  return (
    <div className="tag-input" onClick={(event) => event.currentTarget.querySelector<HTMLInputElement>("input[type='text']")?.focus()}>
      <input type="hidden" name={name} value={submittedValue} />
      {tags.map((tag) => (
        <span key={tag.toLocaleLowerCase()} className="tag-input__chip">
          {tag}
          <button
            type="button"
            aria-label={t(`${tag} 삭제`)}
            onClick={(event) => {
              event.stopPropagation();
              setTags((current) => current.filter((candidate) => candidate !== tag));
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
        className="tag-input__draft"
        value={draft}
        placeholder={tags.length ? "" : t(placeholder)}
        required={required && tags.length === 0}
        maxLength={maxLength}
        onChange={(event) => {
          const next = event.target.value;
          if (/[,;\n]/.test(next)) addTags(splitTags(next));
          else setDraft(next);
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "," || event.key === ";") {
            event.preventDefault();
            commitDraft();
          } else if (event.key === "Backspace" && !draft && tags.length) {
            setTags((current) => current.slice(0, -1));
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
