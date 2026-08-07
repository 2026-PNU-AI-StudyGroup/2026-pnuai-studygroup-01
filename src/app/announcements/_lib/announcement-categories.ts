import type { AnnouncementCategory } from "@/modules/announcement/application/announcement-ports";

export const ANNOUNCEMENT_CATEGORIES: readonly AnnouncementCategory[] = [
  "GENERAL",
  "HACKATHON",
  "GRADUATION_PROJECT",
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
