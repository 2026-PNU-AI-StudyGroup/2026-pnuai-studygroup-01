import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { koreanDateTime, reportTypeLabel } from "@/app/teams/[teamId]/_lib/report-form-shared";
import type { ReportType } from "@/modules/report/domain/report-policy";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ReportSubmissionFields({
  requirements,
}: {
  requirements: Array<{ type: ReportType; dueAt: Date }>;
}) {
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"보고서 종류"}</UiText><CustomSelect name="type" defaultValue={requirements[0]?.type} options={requirements.map((requirement) => ({
          value: requirement.type,
          label: reportTypeLabel[requirement.type],
          description: `${koreanDateTime.format(requirement.dueAt)}까지`,
        }))} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"보고서 파일"}</UiText><input name="file" type="file" required accept=".pdf,.doc,.docx" className="field" />
      </label>
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
        <UiText>{"버전 설명"}</UiText><span className="muted font-normal"><UiText>{"선택 입력"}</UiText></span>
        <UiTextarea name="description" maxLength={2000} rows={2} placeholder="이번 버전에서 변경한 내용을 입력하세요." className="field" />
      </label>
    </>
  );
}
