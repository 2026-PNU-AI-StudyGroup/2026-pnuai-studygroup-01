import { CustomSelect } from "@/shared/ui/custom-select";

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
    <div className="flex gap-2 border-b border-[var(--line)] px-5 py-4 sm:px-7" role="group" aria-label="결과물 등록 방식">
      {(["LINK", "FILE"] as const).map((value) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          aria-pressed={method === value}
          onClick={() => onChange(value)}
          className={method === value ? "button-primary" : "button-quiet"}
        >
          {value === "LINK" ? "외부 링크" : "파일 업로드"}
        </button>
      ))}
    </div>
  );
}

export function ArtifactRegistrationFields({ method }: { method: ArtifactMethod }) {
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold">
        결과물 종류
        <CustomSelect key={method} name="type" defaultValue={method === "LINK" ? "SOURCE_CODE" : "PRESENTATION_VIDEO"} options={[
          { value: "SOURCE_CODE", label: "소스 코드" },
          { value: "PRESENTATION_VIDEO", label: "발표 영상" },
          { value: "POSTER", label: "포스터" },
          { value: "OTHER", label: "기타" },
        ]} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        결과물 제목
        <input name="title" required maxLength={200} placeholder="예: 최종 발표 자료" className="field" />
      </label>
      {method === "LINK" ? (
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          외부 링크
          <input name="externalUrl" required type="url" placeholder="https://github.com/example/project" className="field" />
        </label>
      ) : (
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          결과물 파일
          <input name="file" type="file" required accept=".pdf,.doc,.docx,.zip,.mp4,.webm,.png,.jpg,.jpeg" className="field" />
        </label>
      )}
    </>
  );
}
