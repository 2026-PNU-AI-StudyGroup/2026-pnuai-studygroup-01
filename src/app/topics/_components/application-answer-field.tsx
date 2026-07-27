"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ChangeEvent } from "react";
import { useId, useState } from "react";

import type { PublicTopicSummary } from "@/modules/topic/application/topic-ports";

type ApplicationQuestion = PublicTopicSummary["applicationQuestions"][number];

export function ApplicationAnswerField({ question }: { question: ApplicationQuestion }) {
  const [value, setValue] = useState("");
  const descriptionId = useId();
  const common = {
    name: `answer:${question.id}`,
    maxLength: question.maxLength,
    required: question.required,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value),
    className: "field",
    "aria-describedby": descriptionId,
  };

  return (
    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
      <UiText>{question.label}</UiText> <span className="muted text-xs font-medium"><UiText>{question.required ? "필수" : "선택"}</UiText></span>
      {question.maxLength <= 200 ? <input {...common} /> : <textarea {...common} rows={5} />}
      <span id={descriptionId} className="muted text-right text-xs">{value.length} / {question.maxLength}<UiText>{"자"}</UiText></span>
    </label>
  );
}
