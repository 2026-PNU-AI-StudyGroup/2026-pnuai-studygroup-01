"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";

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
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M10 3v10m0 0 3.5-3.5M10 13 6.5 9.5M4 15.5h12" /></svg>
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
