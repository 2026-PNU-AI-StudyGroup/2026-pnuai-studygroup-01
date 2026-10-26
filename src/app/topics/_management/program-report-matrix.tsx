import Link from "next/link";

import type { ProgramReportCellState, ProgramReportMatrix } from "@/modules/report/infrastructure/prisma-program-report-matrix-query";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

const cellPresentation: Record<ProgramReportCellState, { label: string; tone: "success" | "warning" | "info" | "danger" | "neutral" }> = {
  APPROVED: { label: "승인", tone: "success" },
  REVISION_REQUESTED: { label: "수정 요청", tone: "warning" },
  PENDING_REVIEW: { label: "검토 대기", tone: "info" },
  OVERDUE: { label: "기한 초과", tone: "danger" },
  NOT_SUBMITTED: { label: "미제출", tone: "neutral" },
};

/**
 * 팀 x 보고서 현황표.
 *
 * 줄은 팀, 칸은 보고서다. 운영자는 열 아래로 훑어 누가 안 냈는지, 줄 옆으로 훑어 한 팀이 어디까지 왔는지 본다.
 * 칸 상태는 글자와 색을 같이 써서 색을 구분하기 어려운 사람도 읽을 수 있게 한다.
 */
export function ProgramReportMatrixTable({ matrix }: { matrix: ProgramReportMatrix }) {
  if (!matrix.columns.length) return <EmptyState variant="compact" title="등록된 보고서가 없습니다" description="아래에서 보고서와 마감일을 추가하면 팀별 제출 현황이 여기에 표로 보입니다." />;
  if (!matrix.rows.length) return <EmptyState variant="compact" title="아직 꾸려진 팀이 없습니다" description="팀이 확정되면 팀별 제출 현황이 표로 보입니다." />;

  const submittedCount = (columnId: string) => matrix.rows.filter((row) => {
    const state = row.cells[columnId];
    return state === "APPROVED" || state === "PENDING_REVIEW" || state === "REVISION_REQUESTED";
  }).length;

  return (
    // grid 자식은 min-width 가 auto 라 표 너비만큼 늘어나 페이지가 가로로 밀린다. min-w-0 으로 표 안에서만 구르게 한다.
    <div className="w-fit min-w-0 max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
      <table className="min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-left">
            <th scope="col" className="sticky left-0 z-[1] bg-[var(--surface-subtle)] px-4 py-3 text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트"}</UiText></th>
            {matrix.columns.map((column) => (
              <th key={column.id} scope="col" className="px-4 py-3 align-bottom text-xs font-semibold text-[var(--muted)]">
                <span className="block text-[var(--ink)]"><UiText>{column.title}</UiText>{column.required ? null : <> <UiText>{"(선택)"}</UiText></>}</span>
                <span className="mt-0.5 block font-normal tabular-nums"><UiDate value={column.dueAt} mode="date" /></span>
                <span className="mt-0.5 block font-normal tabular-nums"><UiText>{"제출한 팀"}</UiText> {submittedCount(column.id)}/{matrix.rows.length}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.teamId} className="border-t border-[var(--line)] first:border-t-0">
              <th scope="row" className="sticky left-0 z-[1] max-w-[18rem] bg-[var(--surface)] px-4 py-3 text-left font-semibold">
                <Link href={`/projects/${row.projectId}/reports`} className="block truncate text-[var(--ink)] hover:text-[var(--primary)] hover:underline" title={row.projectTitle}><UiText>{row.projectTitle}</UiText></Link>
                {row.teamName !== row.projectTitle ? <span className="mt-0.5 block truncate text-xs font-normal text-[var(--muted)]"><UiText>{row.teamName}</UiText></span> : null}
              </th>
              {matrix.columns.map((column) => {
                const state = row.cells[column.id];
                return (
                  <td key={column.id} className="px-4 py-3">
                    {state ? <StatusBadge tone={cellPresentation[state].tone}>{cellPresentation[state].label}</StatusBadge> : <span className="text-[var(--muted)]">–</span>}
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
