import { koreanDateTime, reportTypeLabel } from "@/app/teams/[teamId]/_lib/report-form-shared";
import type { ReportType } from "@/modules/report/domain/report-policy";

export function ReportSubmissionFields({
  requirements,
}: {
  requirements: Array<{ type: ReportType; dueAt: Date }>;
}) {
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold">
        보고서 종류
        <select name="type" className="field" defaultValue={requirements[0]?.type}>
          {requirements.map((requirement) => (
            <option key={requirement.type} value={requirement.type}>
              {reportTypeLabel[requirement.type]} · {koreanDateTime.format(requirement.dueAt)}까지
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        보고서 파일
        <input name="file" type="file" required accept=".pdf,.doc,.docx" className="field" />
      </label>
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
        버전 설명 <span className="muted font-normal">선택 입력</span>
        <textarea name="description" maxLength={2000} rows={2} placeholder="이번 버전에서 변경한 내용을 입력하세요." className="field" />
      </label>
    </>
  );
}
