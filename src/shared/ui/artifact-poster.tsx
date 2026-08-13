"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
import { DownloadIcon } from "@/shared/ui/workspace-icons";

// 포스터를 본문에 이미지로 바로 노출한다. 이미지가 아니거나(파일 없음/ PDF 등) 로드 실패 시 다운로드 링크로 폴백.
export function ArtifactPoster({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // 하이드레이션 전에 로드 실패(onError 놓침) 대비: 마운트 시 이미 깨진 이미지면 폴백.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) {
    return (
      <a className="button-secondary gap-2" href={src}>
        <DownloadIcon className="size-4 shrink-0" />
        <UiText>{"파일 받기"}</UiText>
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
      src={src}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
