"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { DownloadIcon } from "@/app/teams/[teamId]/_components/workspace-icons";
import { UiText } from "@/modules/translation/ui/i18n-provider";

// 포스터 이미지를 본문에 바로 노출한다. 파일이 없거나 이미지가 아니면 다운로드 링크로 폴백.
export function ArtifactPoster({ fileId, title }: { fileId: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // 하이드레이션 전에 로드 실패(onError 놓침) 대비: 마운트 시 이미 깨진 이미지면 폴백.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) {
    return (
      <a className="button-secondary gap-2" href={`/api/files/${fileId}`}>
        <DownloadIcon className="size-4" /><UiText>{"파일 받기"}</UiText>
      </a>
    );
  }
  return (
    <Image
      ref={ref}
      alt={title}
      className="h-auto w-full rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]"
      width={0}
      height={0}
      sizes="(min-width: 768px) 48rem, 100vw"
      src={`/api/files/${fileId}`}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
