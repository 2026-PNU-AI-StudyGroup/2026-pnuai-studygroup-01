"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  registerArtifactAction,
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
import { UiButton, UiInput, UiSection } from "@/modules/translation/ui/localized-elements";

export type ShowcaseImage = { id: string; title: string; src: string };

const IMAGE_ACCEPT = "image/png,image/jpeg";

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
      const uploadId = await uploadTeamFile(teamId, "ARTIFACT", file);
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
        const uploadId = await uploadTeamFile(teamId, "ARTIFACT", file);
        const data = new FormData();
        data.set("teamId", teamId);
        data.set("type", "IMAGE");
        data.set("title", fileTitle(file.name));
        data.set("uploadId", uploadId);
        last = await registerArtifactAction(data);
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
    <UiSection
      aria-label="쇼케이스 이미지 관리"
      className="space-y-7 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:p-7"
    >
      <div className="space-y-1">
        <h2 className="text-base font-extrabold tracking-[-0.02em]"><UiText>{"쇼케이스 이미지"}</UiText></h2>
        <p className="muted text-sm leading-6"><UiText>{"지난 프로젝트 상세에 노출되는 대표 이미지와 갤러리 사진을 관리합니다."}</UiText></p>
      </div>

      <div className="space-y-2">
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]"><UiText>{"대표 이미지"}</UiText></span>
        <div className="grid gap-4 sm:grid-cols-[20rem_1fr] sm:items-stretch">
          <div className="relative aspect-video w-full self-start overflow-hidden rounded-[var(--radius-panel)] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)]">
            {thumbnailPath ? (
              <Image src={thumbnailPath} alt="" fill unoptimized sizes="20rem" className="object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center px-4 text-center">
                <span className="muted text-sm"><UiText>{"대표 이미지가 없습니다"}</UiText></span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3 text-sm leading-6">
            <p className="font-semibold"><UiText>{"권장 규격"}</UiText></p>
            <ul className="muted mt-1 list-disc space-y-0.5 pl-4">
              <li><UiText>{"가로형 16:9 비율"}</UiText></li>
              <li><UiText>{"권장 크기 1280×720 이상"}</UiText></li>
              <li><UiText>{"JPG 또는 PNG · 최대 1GB"}</UiText></li>
            </ul>
            <p className="muted mt-2 text-xs"><UiText>{"목록 카드와 상세 상단에 대표로 사용됩니다."}</UiText></p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-secondary" disabled={pending} onClick={() => thumbnailInputRef.current?.click()}>
            <UiText>{thumbnailPath ? "이미지 교체" : "이미지 올리기"}</UiText>
          </button>
          {thumbnailPath ? (
            <button type="button" className="button-quiet" disabled={pending} onClick={removeThumbnail}><UiText>{"삭제"}</UiText></button>
          ) : null}
        </div>
        <UiInput ref={thumbnailInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pickThumbnail} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]"><UiText>{"갤러리 사진"}</UiText></span>
          <button type="button" className="button-secondary" disabled={pending} onClick={() => galleryInputRef.current?.click()}><UiText>{"사진 추가"}</UiText></button>
        </div>
        <UiInput ref={galleryInputRef} type="file" accept={IMAGE_ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={addImages} />
        {order.length === 0 ? (
          <p className="muted rounded-[var(--radius-control)] border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm"><UiText>{"추가한 사진이 없습니다. 사진을 올리면 상세 갤러리에 순서대로 표시됩니다."}</UiText></p>
        ) : (
          <>
            <p className="muted text-xs"><UiText>{"사진을 드래그해 순서를 바꿀 수 있습니다. 왼쪽부터 상세 갤러리에 표시됩니다."}</UiText></p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {order.map((image, index) => (
                <li
                  key={image.id}
                  draggable={!pending}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={handleDragEnd}
                  className={`group relative cursor-grab overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] active:cursor-grabbing ${dragIndex === index ? "opacity-60 ring-2 ring-[var(--primary)]" : ""}`}
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

      {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
      {pending ? <p role="status" aria-live="polite" className="muted text-sm font-semibold"><UiText>{"처리 중"}</UiText></p> : null}
    </UiSection>
  );
}
