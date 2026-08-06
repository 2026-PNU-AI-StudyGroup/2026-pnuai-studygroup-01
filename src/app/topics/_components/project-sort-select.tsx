"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ProjectSortSelect({ phase, programId, query, sort }: {
  phase: PublicTopicPhase;
  programId?: string;
  query: string;
  sort: PublicTopicSort;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function applySort(nextSort: string) {
    const params = new URLSearchParams({ phase });
    if (programId) params.set("programId", programId);
    if (query) params.set("q", query);
    params.set("sort", nextSort);
    startTransition(() => {
      router.push(`/topics?${params.toString()}`);
    });
  }

  return (
    <label>
      <span className="sr-only"><UiText>{"프로젝트 정렬"}</UiText></span>
      <CustomSelect
        name="sort"
        defaultValue={sort}
        onValueChange={applySort}
        options={[
          { value: "LATEST", label: "최신순" },
          { value: "DEADLINE", label: "마감 임박순" },
        ]}
      />
    </label>
  );
}
