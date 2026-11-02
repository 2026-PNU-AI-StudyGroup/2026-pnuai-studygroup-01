"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveShowcaseBasicsAction } from "@/app/projects/[projectId]/_actions/team-report-actions";
import { initialReportActionState } from "@/app/projects/[projectId]/_lib/report-form-shared";
import { UiText } from "@/modules/translation/ui/i18n-provider";

// 소개 글·영상 링크 폼은 각자 저장 버튼을 갖고 있다. 이 버튼은 그 폼들의 값을 한 번에 모아
// 저장하고 방문자에게 보이는 프로젝트 상세로 보낸다. 사진·대표 이미지·자료는 고르는 즉시 올라가므로
// 여기서 다시 저장할 것이 없다.
export function ShowcaseSaveAllBar({ teamId, topicId }: { teamId: string; topicId: string }) {
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
      if (result.status === "success") router.push(`/topics/${topicId}?view=public`);
      else setState(result);
    });
  }

  // 제목 줄 오른쪽의 채운 버튼. 작성을 마친 뒤 하는 일이라 이 화면의 할 일 하나로 둔다.
  return (
    <>
      {state.status === "error" ? <p role="alert" className="text-[0.8125rem] font-medium text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
      <button type="button" className="button-primary button-compact shrink-0" disabled={pending} onClick={saveAll}>
        <UiText>{pending ? "저장 중" : "저장하고 방문자 화면 보기"}</UiText>
      </button>
    </>
  );
}
