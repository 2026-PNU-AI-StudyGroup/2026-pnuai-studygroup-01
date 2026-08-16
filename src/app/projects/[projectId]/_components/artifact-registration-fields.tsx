import { UiDiv, UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { FileInput, TextInput } from "@/shared/ui/form-system";

export type ArtifactMethod = "LINK" | "FILE";

export function ArtifactMethodSelector({
  method,
  pending,
  onChange,
}: {
  method: ArtifactMethod;
  pending: boolean;
  onChange: (method: ArtifactMethod) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold"><UiText>{"결과물 등록 방식"}</UiText></span>
      <UiDiv className="grid grid-cols-2 gap-2" role="group" aria-label="결과물 등록 방식">
        {(["LINK", "FILE"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={method === value}
            onClick={() => onChange(value)}
            className={`${method === value ? "button-primary" : "button-secondary"} w-full justify-center`}
          >
            <UiText>{value === "LINK" ? "외부 링크" : "파일 업로드"}</UiText>
          </button>
        ))}
      </UiDiv>
    </div>
  );
}

export function ArtifactRegistrationFields() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"결과물 종류"}</UiText><CustomSelect name="type" ariaLabel="결과물 종류" defaultValue="SOURCE_CODE" options={[
          { value: "SOURCE_CODE", label: "소스 코드" },
          { value: "OTHER", label: "기타" },
        ]} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"결과물 제목"}</UiText><UiInput name="title" required maxLength={200} placeholder="예: 최종 발표 자료" className="form-control" />
      </label>
    </div>
  );
}

export function ArtifactContentField({ method }: { method: ArtifactMethod }) {
  return (
    <>
      {method === "LINK" ? (
        <label className="grid gap-2 text-sm font-semibold">
          <UiText>{"외부 링크"}</UiText><TextInput name="externalUrl" required type="url" placeholder="https://github.com/example/project" />
        </label>
      ) : (
        <label className="grid gap-2 text-sm font-semibold">
          <UiText>{"결과물 파일"}</UiText>
          <span className="muted text-xs font-normal"><UiText>{"문서·압축 · 최대 100MB"}</UiText></span>
          <FileInput aria-label="결과물 파일" name="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" />
        </label>
      )}
    </>
  );
}
