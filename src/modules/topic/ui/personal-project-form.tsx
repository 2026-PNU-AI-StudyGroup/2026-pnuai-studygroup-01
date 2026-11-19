"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { FormField, TextInput, Textarea } from "@/shared/ui/form-system";


export type PersonalProjectActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string; projectId: string };

type Preview = (repoUrl: string) => Promise<{ status: "success"; preview: { title: string; summary: string } } | { status: "error"; message: string }>;

export function PersonalProjectForm({ action, previewGithubReadme, program }: {
  action: (state: PersonalProjectActionState, formData: FormData) => Promise<PersonalProjectActionState>;
  previewGithubReadme: Preview;
  program: { id: string; name: string; divisions?: Array<{ id: string; name: string }> };
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as PersonalProjectActionState);
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [readmeMessage, setReadmeMessage] = useState("");
  const [readmePending, startReadme] = useTransition();

  function loadReadme() {
    if (!repoUrl.trim()) return;
    setReadmeMessage("");
    startReadme(async () => {
      const result = await previewGithubReadme(repoUrl.trim());
      if (result.status === "error") {
        setReadmeMessage(result.message);
        return;
      }
      setTitle((current) => current.trim() ? current : result.preview.title);
      if (result.preview.summary) setDescription((current) => current.trim() ? current : result.preview.summary);
      setReadmeMessage("README 에서 제목과 설명을 가져왔습니다. 확인하고 고쳐 주세요.");
    });
  }

  if (state.status === "success") {
    return (
      <div className="grid gap-4">
        <p role="status" className="font-semibold"><UiText>{state.message}</UiText></p>
        <p className="text-sm text-[var(--muted)]"><UiText>{"결과물 화면에서 대표 이미지와 시연 영상을 확인하고 바꿀 수 있습니다."}</UiText></p>
        <Link className="button-primary w-fit" href={`/projects/${state.projectId}/artifacts`}><UiText>{"결과물 화면으로"}</UiText></Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="programId" value={program.id} />
      <p className="text-sm text-[var(--muted)]"><UiText>{"저장하면 바로 공개됩니다. 이 프로그램에는 프로젝트를 1개만 올릴 수 있습니다."}</UiText></p>
      {program.divisions?.length ? (
        <FormField id="personal-division" label="분과" required>
          <CustomSelect id="personal-division" name="divisionId" ariaLabel="분과" required value={divisionId} onValueChange={setDivisionId} placeholder="분과를 선택하세요" options={program.divisions.map((division) => ({ value: division.id, label: division.name }))} />
        </FormField>
      ) : null}
      <FormField id="personal-github" label="GitHub 레포" optional description="공개 레포 주소를 넣으면 README 로 제목과 설명을 채우고, README 첫 그림을 대표 이미지로 씁니다.">
        <div className="flex gap-2">
          <TextInput id="personal-github" name="repoUrl" type="url" inputMode="url" placeholder="https://github.com/아이디/레포" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          <button type="button" className="button-secondary shrink-0" onClick={loadReadme} disabled={readmePending || !repoUrl.trim()}>
            <UiText>{readmePending ? "가져오는 중" : "README 가져오기"}</UiText>
          </button>
        </div>
        {readmeMessage ? <p role="status" className="mt-2 text-sm text-[var(--muted)]"><UiText>{readmeMessage}</UiText></p> : null}
      </FormField>
      <FormField id="personal-title" label="프로젝트명" required>
        <TextInput id="personal-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
      </FormField>
      <FormField id="personal-description" label="설명" required>
        <Textarea id="personal-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10_000} required rows={4} />
      </FormField>
      {state.status === "error" ? <p role="alert" className="text-sm text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
      <div className="flex justify-end">
        <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "올리는 중" : "프로젝트 올리기"}</UiText></button>
      </div>
    </form>
  );
}
