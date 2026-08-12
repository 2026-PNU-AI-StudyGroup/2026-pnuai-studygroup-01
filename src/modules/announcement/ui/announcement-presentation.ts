import type { AnnouncementCategory } from "@/modules/announcement/application/announcement-ports";

export const ANNOUNCEMENT_CATEGORIES: readonly AnnouncementCategory[] = [
  "GENERAL",
  "HACKATHON",
  // 졸업과제는 다른 사이트로 이관 — 필터 칩·작성 옵션에서 숨김.
  // (기존 데이터 렌더용 라벨/뱃지는 아래 맵에 유지, 되돌리려면 이 줄 주석 해제)
  // "GRADUATION_PROJECT",
];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  GENERAL: "일반",
  HACKATHON: "해커톤",
  GRADUATION_PROJECT: "졸업과제",
};

export const ANNOUNCEMENT_CATEGORY_BADGE: Record<AnnouncementCategory, string> = {
  GENERAL: "bg-[var(--surface-subtle)] text-[var(--muted)]",
  HACKATHON: "bg-[var(--primary-subtle)] text-[var(--primary)]",
  GRADUATION_PROJECT: "bg-[var(--success-subtle)] text-[var(--success)]",
};

export function isAnnouncementCategory(value: string | undefined): value is AnnouncementCategory {
  return value !== undefined && (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(value);
}
