"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveShowcaseBasicsAction } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { initialReportActionState } from "@/app/projects/[projectId]/_lib/report-form-shared";
import { UiText } from "@/modules/translation/ui/i18n-provider";

// 소개 글·영상 링크 폼은 각자 저장 버튼을 갖고 있다. 이 버튼은 그 폼들의 값을 한 번에 모아
// 저장하고 프로젝트 찾기 화면으로 보낸다. 사진·대표 이미지·자료는 고르는 즉시 올라가므로
// 여기서 다시 저장할 것이 없다.
export function ShowcaseSaveAllBar({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [state, setState] = useState(initialReportActionState);
  const [pending, startTransition] = useTransition();

  function saveAll() {
    setState(initialReportActionState);
    startTransition(async () => {
      const data = new FormData();
      for (const form of document.querySelectorAll<HTMLFormElement>("form[data-showcase-form]")) {
        for (const [key, value] of new FormData(form)) {
          if (typeof value === "string") data.set(key, value);
        }
      }
      data.set("teamId", teamId);
      const result = await saveShowcaseBasicsAction(data);
      if (result.status === "success") router.push("/topics");
      else setState(result);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 py-4 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:px-6">
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-[var(--ink)]"><UiText>{"작성을 마쳤나요?"}</UiText></p>
        {state.status === "error" ? (
          <p role="alert" className="mt-1 text-sm font-semibold leading-6 text-[var(--danger)]"><UiText>{state.message}</UiText></p>
        ) : (
          <p className="muted mt-1 text-sm leading-6"><UiText>{"소개 글과 영상 링크를 저장하고 프로젝트 찾기로 이동합니다."}</UiText></p>
        )}
      </div>
      <button type="button" className="button-primary shrink-0" disabled={pending} onClick={saveAll}>
        <UiText>{pending ? "저장 중" : "전체 저장"}</UiText>
      </button>
    </div>
  );
}
