"use client";

import Image from "next/image";
import { useId, useState } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton, UiSection } from "@/modules/translation/ui/localized-elements";

export type ProjectMediaItem =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; embedUrl: string; title: string };

// 프로젝트 대표 미디어(이미지·유튜브)를 16:9 캐러셀로 보여준다. 이미지는 잘리지 않게
// object-contain으로 전체를 담고, 여러 개면 좌우 화살표와 하단 도트로 넘긴다.
export function ProjectMediaCarousel({ items }: { items: ProjectMediaItem[] }) {
  const carouselId = useId();
  const [index, setIndex] = useState(0);
  const isEmpty = items.length === 0;
  const current = items.length ? items[Math.min(index, items.length - 1)] : null;
  const move = (direction: -1 | 1) =>
    setIndex((value) => (value + direction + items.length) % items.length);

  return (
    <UiSection id={carouselId} aria-roledescription="carousel" aria-label="프로젝트 미디어" className="space-y-3">
      <div className={`relative aspect-video w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] ${isEmpty ? "grid place-items-center" : ""}`}>
        {isEmpty ? (
          <div className="grid w-full place-items-center gap-1 text-center">
            <span className="text-sm font-semibold text-[var(--muted)]"><UiText>{"프로젝트 이미지 준비 중"}</UiText></span>
            <span className="text-xs font-medium text-[var(--muted)]"><UiText>{"내 프로젝트 > 프로젝트 > 결과물에서 등록할 수 있습니다."}</UiText></span>
          </div>
        ) : current?.kind === "image" ? (
          // /api/files 는 로그인 쿠키를 요구한다. 이미지 최적화 서버는 쿠키 없이 가져가 401 을 받는다.
          <Image
            key={current.src}
            alt={current.alt}
            src={current.src}
            fill
            priority={index === 0}
            sizes="(min-width: 1024px) 48rem, 100vw"
            className="object-contain"
            unoptimized
          />
        ) : current ? (
          <iframe
            key={current.embedUrl}
            className="size-full"
            src={current.embedUrl}
            title={current.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : null}

        {items.length > 1 || isEmpty ? (
          <>
            <button
              type="button"
              aria-controls={carouselId}
              onClick={() => move(-1)}
              disabled={isEmpty}
              className="absolute left-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)]/90 text-[var(--ink)] backdrop-blur transition-colors hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.8]"><path d="m12 4-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="sr-only"><UiText>{"이전 미디어"}</UiText></span>
            </button>
            <button
              type="button"
              aria-controls={carouselId}
              onClick={() => move(1)}
              disabled={isEmpty}
              className="absolute right-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)]/90 text-[var(--ink)] backdrop-blur transition-colors hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.8]"><path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="sr-only"><UiText>{"다음 미디어"}</UiText></span>
            </button>
          </>
        ) : null}
      </div>

      {items.length > 1 || isEmpty ? (
        <div className="flex items-center justify-center gap-1.5">
          {isEmpty ? <UiButton type="button" disabled aria-label="프로젝트 이미지 없음" className="h-2 w-5 rounded-full bg-[var(--line-strong)] opacity-35" /> : items.map((item, dotIndex) => {
            const active = dotIndex === Math.min(index, items.length - 1);
            const label = item.kind === "video" ? item.title : item.alt;
            return (
              <button
                key={item.kind === "video" ? item.embedUrl : item.src}
                type="button"
                aria-controls={carouselId}
                aria-current={active ? "true" : undefined}
                onClick={() => setIndex(dotIndex)}
                className={`h-2 rounded-full transition-all ${active ? "w-5 bg-[var(--primary)]" : "w-2 bg-[var(--line-strong)] hover:bg-[var(--muted)]"}`}
              >
                <span className="sr-only">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </UiSection>
  );
}
