"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import {
  registerShowcaseImageAction,
  removeArtifactAction,
  reorderArtifactsAction,
  setTeamThumbnailAction,
  type ReportActionState,
} from "@/app/projects/[projectId]/_actions/team-report-actions";
import {
  initialReportActionState,
  isUploadAbortError,
  uploadFailureMessage,
  uploadTeamFile,
} from "@/app/projects/[projectId]/_lib/report-form-shared";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { SHOWCASE_IMAGE_MAX_BYTES } from "@/modules/file/domain/upload-policy";
import { UiButton, UiInput } from "@/modules/translation/ui/localized-elements";
import { FormSection } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { optimizeShowcaseImage } from "@/app/projects/[projectId]/_lib/showcase-image-optimization";

export type ShowcaseImage = { id: string; title: string; src: string };

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const SHOWCASE_IMAGE_MAX_BYTES_MESSAGE = "쇼케이스 이미지는 최대 20MB까지 업로드할 수 있습니다.";

function fileTitle(name: string): string {
  return name.replace(/\.[^./\\]+$/, "").trim().slice(0, 200) || "이미지";
}

export function ShowcaseManager({
  teamId,
  thumbnailPath,
  images,
}: {
  teamId: string;
  thumbnailPath?: string;
  images: ShowcaseImage[];
}) {
  const router = useRouter();
  const titleId = useId();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ReportActionState>(initialReportActionState);
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState<ShowcaseImage[]>(images);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function run(work: () => Promise<ReportActionState>) {
    setState(initialReportActionState);
    startTransition(async () => {
      try {
        const result = await work();
        setState(result);
        if (result.status === "success") router.refresh();
      } catch (error) {
        if (isUploadAbortError(error)) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : uploadFailureMessage,
        });
      }
    });
  }

  function pickThumbnail(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    run(async () => {
      const optimizedFile = await optimizeShowcaseImage(file);
      const uploadId = await uploadTeamFile(teamId, "ARTIFACT", optimizedFile, {
        maxBytes: SHOWCASE_IMAGE_MAX_BYTES,
        maxBytesMessage: SHOWCASE_IMAGE_MAX_BYTES_MESSAGE,
      });
      const data = new FormData();
      data.set("teamId", teamId);
      data.set("uploadId", uploadId);
      return setTeamThumbnailAction(data);
    });
  }

  function removeThumbnail() {
    run(() => {
      const data = new FormData();
      data.set("teamId", teamId);
      data.set("uploadId", "");
      return setTeamThumbnailAction(data);
    });
  }

  function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    run(async () => {
      let last = initialReportActionState;
      for (const file of files) {
        const optimizedFile = await optimizeShowcaseImage(file);
        const uploadId = await uploadTeamFile(teamId, "ARTIFACT", optimizedFile, {
          maxBytes: SHOWCASE_IMAGE_MAX_BYTES,
          maxBytesMessage: SHOWCASE_IMAGE_MAX_BYTES_MESSAGE,
        });
        const data = new FormData();
        data.set("teamId", teamId);
        data.set("type", "IMAGE");
        data.set("title", fileTitle(file.name));
        data.set("uploadId", uploadId);
        last = await registerShowcaseImageAction(data);
        if (last.status === "error") return last;
      }
      return last;
    });
  }

  function removeImage(artifactId: string) {
    run(() => {
      const data = new FormData();
      data.set("teamId", teamId);
      data.set("artifactId", artifactId);
      return removeArtifactAction(initialReportActionState, data);
    });
  }

  function handleDragEnter(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
    const changed = order.some((image, index) => image.id !== images[index]?.id);
    if (changed) {
      run(() => {
        const data = new FormData();
        data.set("teamId", teamId);
        data.set("orderedIds", order.map((image) => image.id).join(","));
        return reorderArtifactsAction(data);
      });
    }
  }

  return (
    <FormSection
      id={titleId}
      title={<UiText>{"쇼케이스 이미지"}</UiText>}
      description={<UiText>{"가로형 3:2 비율, 권장 크기 600×400 이상"}</UiText>}
      bodyClassName="space-y-5 px-5 py-4"
    >
      <div className="space-y-2">
        <span className="block text-[0.8125rem] font-medium text-[var(--ink)]"><UiText>{"대표 이미지"}</UiText></span>
        <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
          <div className={`relative aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-control)] border ${thumbnailPath ? "border-[var(--line)]" : "border-dashed border-[var(--line-strong)]"}`}>
            {thumbnailPath ? (
              <Image src={thumbnailPath} alt="" fill unoptimized sizes="14rem" className="object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center px-4 text-center">
                <span className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"대표 이미지가 없습니다"}</UiText></span>
              </div>
            )}
          </div>
          {/* 표지 옆에 규격과 손잡이를 함께 둔다. 프로젝트 목록과 상세 머리에 이 그림이 실린다. */}
          <div className="grid gap-2 text-[0.8125rem] text-[var(--muted)]">
            <p><UiText>{"프로젝트 목록과 상세 화면 머리에 실립니다."}</UiText></p>
            <p><UiText>{"JPG, PNG 또는 WebP · 최대 20MB"}</UiText></p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="button-secondary button-compact min-h-8 px-3 font-medium" disabled={pending} onClick={() => thumbnailInputRef.current?.click()}>
                <UiText>{thumbnailPath ? "이미지 교체" : "이미지 올리기"}</UiText>
              </button>
              {thumbnailPath ? (
                <button type="button" className="button-quiet button-compact min-h-8 px-3 font-medium text-[var(--danger)]" disabled={pending} onClick={removeThumbnail}><UiText>{"삭제"}</UiText></button>
              ) : null}
            </div>
          </div>
        </div>
        <UiInput ref={thumbnailInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pickThumbnail} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] font-medium text-[var(--ink)]"><UiText>{"갤러리 사진"}</UiText>{" "}<span className="font-normal tabular-nums text-[var(--muted)]">{order.length}<UiText>{"장"}</UiText></span></span>
          <button type="button" className="button-secondary button-compact min-h-8 px-3 font-medium" disabled={pending} onClick={() => galleryInputRef.current?.click()}><UiText>{"사진 추가"}</UiText></button>
        </div>
        <UiInput ref={galleryInputRef} type="file" accept={IMAGE_ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={addImages} />
        {order.length === 0 ? (
          <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--line-strong)] px-4 py-3 text-[0.8125rem] text-[var(--muted)]"><UiText>{"추가한 사진이 없습니다."}</UiText></p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {order.map((image, index) => (
                <li
                  key={image.id}
                  draggable={!pending}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={handleDragEnd}
                  className={`group relative cursor-grab overflow-hidden rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] active:cursor-grabbing ${dragIndex === index ? "opacity-60 ring-2 ring-[var(--primary)]" : ""}`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-[var(--surface-subtle)]">
                    <Image src={image.src} alt={image.title} fill unoptimized sizes="(min-width: 1024px) 16rem, 45vw" className="pointer-events-none object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-[var(--ink)]/75 px-2 py-0.5 text-[0.6875rem] font-bold text-white tabular-nums">{index + 1}</span>
                    <UiButton
                      type="button"
                      aria-label="사진 삭제"
                      className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-[var(--ink)]/70 text-sm text-white hover:bg-[var(--danger)] disabled:opacity-50"
                      disabled={pending}
                      onClick={() => removeImage(image.id)}
                    >✕</UiButton>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {state.status === "error" ? <p role="alert" className="text-[0.8125rem] font-medium text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
      {pending ? <p role="status" aria-live="polite" className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"처리 중"}</UiText></p> : null}
    </FormSection>
  );
}
