"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";

import {
  addShowcaseImageAction,
  publishShowcaseAction,
  removeShowcaseImageAction,
  saveShowcaseAction,
  setShowcaseAwardAction,
  setShowcaseCoverAction,
} from "@/app/showcase/_actions/showcase-actions";
import { uploadShowcaseImage, ShowcaseImageUploadError } from "@/app/showcase/_lib/showcase-image-upload";
import { SHOWCASE_LIMITS, showcaseInitialState } from "@/app/showcase/_lib/showcase-options";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FormField } from "@/shared/ui/form-system";

export type ShowcaseEditorImage = { id: string; isCover: boolean };
export type ShowcaseEditorData = {
  teamId: string;
  summary: string;
  githubUrl: string | null;
  youtubeUrl: string | null;
  demoUrl: string | null;
  isPublished: boolean;
  images: ShowcaseEditorImage[];
  isAdmin: boolean;
  awardName: string | null;
  awardColor: string | null;
};

function Notice({ status, message }: { status: string; message: string }) {
  if (!message) return null;
  return (
    <p className={`text-sm font-semibold ${status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`} role="status">
      <UiText>{message}</UiText>
    </p>
  );
}

export function ShowcaseEditor({ data }: { data: ShowcaseEditorData }) {
  const { teamId } = data;
  const [saveState, saveAction, saving] = useActionState(saveShowcaseAction.bind(null, teamId), showcaseInitialState);
  const [imageState, imageAction] = useActionState(addShowcaseImageAction.bind(null, teamId), showcaseInitialState);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imageState.status === "success" && fileRef.current) fileRef.current.value = "";
  }, [imageState]);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const controller = new AbortController();
      const uploadId = await uploadShowcaseImage(teamId, file, { signal: controller.signal, onProgress: () => {} });
      const payload = new FormData();
      payload.set("uploadId", uploadId);
      startTransition(() => imageAction(payload));
    } catch (error) {
      setUploadError(error instanceof ShowcaseImageUploadError ? error.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-8">
      {/* 소개 · 링크 */}
      <form action={saveAction} className="panel grid gap-5 p-5 sm:p-7">
        <FormField label="프로젝트 소개" required description="프로젝트를 소개하는 글을 작성해 주세요. 마크다운을 사용할 수 있습니다.">
          <UiTextarea className="form-control min-h-40 bg-white leading-7" name="summary" maxLength={SHOWCASE_LIMITS.summary} defaultValue={data.summary} placeholder="어떤 프로젝트인지, 무엇을 만들었는지 소개해 주세요." required />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="GitHub">
            <UiInput className="form-control bg-white" name="githubUrl" type="url" maxLength={SHOWCASE_LIMITS.url} defaultValue={data.githubUrl ?? ""} placeholder="https://github.com/..." />
          </FormField>
          <FormField label="YouTube">
            <UiInput className="form-control bg-white" name="youtubeUrl" type="url" maxLength={SHOWCASE_LIMITS.url} defaultValue={data.youtubeUrl ?? ""} placeholder="https://youtu.be/..." />
          </FormField>
          <FormField label="데모·사이트">
            <UiInput className="form-control bg-white" name="demoUrl" type="url" maxLength={SHOWCASE_LIMITS.url} defaultValue={data.demoUrl ?? ""} placeholder="https://..." />
          </FormField>
        </div>
        <div className="flex items-center gap-3">
          <button className="button-primary" type="submit" disabled={saving}>
            <UiText>{saving ? "저장 중" : "소개 저장"}</UiText>
          </button>
          <Notice status={saveState.status} message={saveState.message} />
        </div>
      </form>

      {/* 이미지 */}
      <section className="panel grid gap-4 p-5 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]"><UiText>{"이미지"}</UiText></h2>
          <p className="muted mt-1 text-sm"><UiText>{"최대 12장. 첫 이미지가 표지로 쓰입니다."}</UiText></p>
        </div>
        {data.images.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.images.map((image) => (
              <li key={image.id} className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--line)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/showcase-images/${image.id}`} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                <div className="flex items-center justify-between gap-1">
                  {image.isCover ? (
                    <span className="text-xs font-semibold text-[var(--primary)]"><UiText>{"표지"}</UiText></span>
                  ) : (
                    <form action={async (formData) => { await setShowcaseCoverAction(image.id, showcaseInitialState, formData); }}>
                      <button className="button-quiet text-xs" type="submit"><UiText>{"표지로"}</UiText></button>
                    </form>
                  )}
                  <form action={async (formData) => { await removeShowcaseImageAction(image.id, showcaseInitialState, formData); }}>
                    <button className="button-quiet text-xs text-[var(--danger)]" type="submit"><UiText>{"삭제"}</UiText></button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted text-sm"><UiText>{"아직 이미지가 없습니다."}</UiText></p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="button-secondary cursor-pointer">
            <UiText>{uploading ? "업로드 중" : "이미지 추가"}</UiText>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFileChange} disabled={uploading} />
          </label>
          <Notice status={imageState.status} message={imageState.message} />
          {uploadError ? <p className="text-sm font-semibold text-[var(--danger)]" role="status"><UiText>{uploadError}</UiText></p> : null}
        </div>
      </section>

      {/* 공개 */}
      <PublishControl teamId={teamId} isPublished={data.isPublished} />

      {/* 시상 (관리자) */}
      {data.isAdmin ? <AwardControl teamId={teamId} awardName={data.awardName} awardColor={data.awardColor} /> : null}
    </div>
  );
}

function AwardControl({ teamId, awardName, awardColor }: { teamId: string; awardName: string | null; awardColor: string | null }) {
  const [state, action, pending] = useActionState(setShowcaseAwardAction.bind(null, teamId), showcaseInitialState);
  return (
    <form action={action} className="panel grid gap-4 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]"><UiText>{"시상 (관리자)"}</UiText></h2>
        <p className="muted mt-1 text-sm"><UiText>{"수상명을 입력하면 갤러리·상세에 뱃지로 표시됩니다. 비우면 제거됩니다."}</UiText></p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{"수상명"}</UiText></span>
          <UiInput className="form-control bg-white" name="awardName" type="text" maxLength={40} defaultValue={awardName ?? ""} placeholder="예: 대상" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{"뱃지 색"}</UiText></span>
          <input className="form-control h-11 w-20 bg-white" name="awardColor" type="color" defaultValue={awardColor ?? "#2F5BEA"} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className="button-secondary" type="submit" disabled={pending}>
          <UiText>{"시상 저장"}</UiText>
        </button>
        <Notice status={state.status} message={state.message} />
      </div>
    </form>
  );
}

function PublishControl({ teamId, isPublished }: { teamId: string; isPublished: boolean }) {
  const [state, action, pending] = useActionState(
    publishShowcaseAction.bind(null, teamId, !isPublished),
    showcaseInitialState,
  );
  return (
    <form action={action} className="panel flex flex-wrap items-center justify-between gap-3 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]"><UiText>{isPublished ? "공개 중" : "비공개"}</UiText></h2>
        <p className="muted mt-1 text-sm"><UiText>{isPublished ? "누구나 갤러리에서 이 프로젝트를 볼 수 있습니다." : "공개하면 갤러리에 노출됩니다."}</UiText></p>
      </div>
      <div className="flex items-center gap-3">
        <Notice status={state.status} message={state.message} />
        <button className={isPublished ? "button-secondary" : "button-primary"} type="submit" disabled={pending}>
          <UiText>{isPublished ? "공개 해제" : "공개하기"}</UiText>
        </button>
      </div>
    </form>
  );
}
