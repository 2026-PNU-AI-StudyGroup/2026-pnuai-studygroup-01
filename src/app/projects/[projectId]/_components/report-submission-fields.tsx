import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FileInput } from "@/shared/ui/form-system";
import { koreanDateTime } from "@/app/projects/[projectId]/_lib/report-form-shared";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ReportSubmissionFields({
  requirements,
}: {
  requirements: Array<{ id: string; title: string; dueAt: Date }>;
}) {
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"보고서"}</UiText><CustomSelect name="reportId" ariaLabel="보고서" defaultValue={requirements[0]?.id} options={requirements.map((requirement) => ({
          value: requirement.id,
          label: requirement.title,
          description: `${koreanDateTime.format(requirement.dueAt)}까지`,
        }))} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"보고서 파일"}</UiText>
        <span className="muted text-xs font-normal"><UiText>{"PDF 또는 Word · 최대 25MB"}</UiText></span>
        <FileInput aria-label="보고서 파일" name="file" required accept=".pdf,.doc,.docx" />
      </label>
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
        <UiText>{"버전 설명"}</UiText><span className="muted font-normal"><UiText>{"선택 입력"}</UiText></span>
        <UiTextarea name="description" maxLength={2000} rows={2} placeholder="이번 버전에서 변경한 내용을 입력하세요." className="form-control" />
      </label>
    </>
  );
}
