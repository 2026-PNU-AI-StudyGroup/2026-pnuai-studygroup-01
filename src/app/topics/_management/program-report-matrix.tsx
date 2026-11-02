import Link from "next/link";

import type { ProgramReportCellState, ProgramReportMatrix } from "@/modules/report/infrastructure/prisma-program-report-matrix-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { Pill, type PillTone } from "@/modules/project-program/ui/work-screen";

// 손볼 일(검토 대기)은 파랑, 수정 요청은 노랑, 기한 초과만 빨강. 끝난 승인은 회색, 아직 마감 전 미제출은 알약 없이 회색 글자.
const cellPresentation: Record<Exclude<ProgramReportCellState, "NOT_SUBMITTED">, { label: string; tone: PillTone }> = {
  APPROVED: { label: "승인", tone: "plain" },
  REVISION_REQUESTED: { label: "수정 요청", tone: "warning" },
  PENDING_REVIEW: { label: "검토 대기", tone: "accent" },
  OVERDUE: { label: "기한 초과", tone: "danger" },
};

/**
 * 팀 x 보고서 현황표.
 *
 * 줄은 팀, 칸은 보고서다. 운영자는 열 아래로 훑어 누가 안 냈는지, 줄 옆으로 훑어 한 팀이 어디까지 왔는지 본다.
 * 칸 상태는 글자와 색을 같이 써서 색을 구분하기 어려운 사람도 읽을 수 있게 한다. 카드 안에 들어가 테두리 없이 선만 긋는다.
 */
export function ProgramReportMatrixTable({ matrix }: { matrix: ProgramReportMatrix }) {
  if (!matrix.columns.length) return <EmptyLine title="등록된 보고서가 없습니다" description="아래에서 보고서와 마감일을 추가하면 팀별 제출 현황이 여기에 표로 보입니다." />;
  if (!matrix.rows.length) return <EmptyLine title="아직 꾸려진 팀이 없습니다" description="팀이 확정되면 팀별 제출 현황이 표로 보입니다." />;

  const submittedCount = (columnId: string) => matrix.rows.filter((row) => {
    const state = row.cells[columnId];
    return state === "APPROVED" || state === "PENDING_REVIEW" || state === "REVISION_REQUESTED";
  }).length;

  return (
    // grid 자식은 min-width 가 auto 라 표 너비만큼 늘어나 페이지가 가로로 밀린다. min-w-0 으로 표 안에서만 구르게 한다.
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-[0.8125rem]">
        <thead>
          <tr className="text-left">
            <th scope="col" className="sticky left-0 z-[1] bg-[var(--surface)] px-5 pb-2 align-bottom text-xs font-normal text-[var(--muted)]"><UiText>{"프로젝트"}</UiText></th>
            {matrix.columns.map((column) => (
              <th key={column.id} scope="col" className="px-4 pb-2 align-bottom text-xs font-normal text-[var(--muted)] last:pr-5">
                <span className="block font-medium text-[var(--ink)]"><UiText>{column.title}</UiText>{column.required ? null : <> <UiText>{"(선택)"}</UiText></>}</span>
                <span className="mt-0.5 block tabular-nums"><UiDate value={column.dueAt} mode="date" />{" "}<UiText>{"마감"}</UiText></span>
                <span className="mt-0.5 block tabular-nums"><UiText>{"제출한 팀"}</UiText> {submittedCount(column.id)} / {matrix.rows.length}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.teamId} className="border-t border-[var(--line)] transition-colors hover:bg-[#fafbfc]">
              <th scope="row" className="sticky left-0 z-[1] max-w-[22rem] bg-[var(--surface)] px-5 py-2.5 text-left font-normal">
                <Link href={`/projects/${row.projectId}/reports`} className="block truncate text-sm font-medium text-[var(--ink)] hover:text-[var(--primary)]" title={row.projectTitle}><UiText>{row.projectTitle}</UiText></Link>
                {row.teamName !== row.projectTitle ? <span className="mt-0.5 block truncate text-xs text-[var(--muted)]"><UiText>{row.teamName}</UiText></span> : null}
              </th>
              {matrix.columns.map((column) => {
                const state = row.cells[column.id];
                return (
                  <td key={column.id} className="px-4 py-2.5 last:pr-5">
                    {!state ? <span className="text-[var(--muted)]">-</span>
                      : state === "NOT_SUBMITTED" ? <span className="text-[var(--muted)]"><UiText>{"미제출"}</UiText></span>
                      : <Pill tone={cellPresentation[state].tone}>{cellPresentation[state].label}</Pill>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyLine({ title, description }: { title: string; description: string }) {
  return (
    <div role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
      <p className="font-medium text-[var(--ink)]"><UiText>{title}</UiText></p>
      <p className="mt-0.5 text-[var(--muted)]"><UiText>{description}</UiText></p>
    </div>
  );
}
