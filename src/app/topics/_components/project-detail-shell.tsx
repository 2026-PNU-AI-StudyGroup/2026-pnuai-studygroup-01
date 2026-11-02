import type { ReactNode } from "react";

import { UiAside } from "@/modules/translation/ui/localized-elements";

/*
  프로젝트 한 건의 화면. 머리 카드, 숫자 판, 그 아래 본문(넓은 칸)과 팀, 일정 같은 곁 정보(좁은 칸).
  본문 폭이 68rem 이상이면 두 칸, 좁으면 본문 아래로 곁 정보를 쌓는다. 사업 화면과 같은 비율이다.
*/
export function ProjectDetailShell({
  header,
  kpis,
  children,
  side,
  sideLabel = "프로젝트 정보",
}: {
  header: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
  side?: ReactNode;
  sideLabel?: string;
}) {
  return (
    <article className="@container grid min-w-0 gap-3.5">
      {header}
      {kpis}
      <div className="grid items-start gap-3.5 @min-[68rem]:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-3.5">{children}</div>
        {side ? <UiAside aria-label={sideLabel} className="grid min-w-0 gap-3.5">{side}</UiAside> : null}
      </div>
    </article>
  );
}
