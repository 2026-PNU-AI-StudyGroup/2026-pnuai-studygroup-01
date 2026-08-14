import { UiText } from "@/modules/translation/ui/i18n-provider";

export type ProjectGalleryStatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const dotTone = {
  neutral: "bg-white/65",
  info: "bg-[color-mix(in_srgb,var(--primary)_72%,white)]",
  success: "bg-[color-mix(in_srgb,var(--success)_78%,white)]",
  warning: "bg-[color-mix(in_srgb,var(--warning)_75%,white)]",
  danger: "bg-[color-mix(in_srgb,var(--danger)_76%,white)]",
} as const;

export function ProjectGalleryStatusBadge({ label, tone }: { label: string; tone: ProjectGalleryStatusTone }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/15 bg-[rgba(31,35,48,.84)] px-2.5 py-1 text-xs font-bold tracking-[-0.01em] text-white backdrop-blur-sm">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${dotTone[tone]}`} />
      <UiText>{label}</UiText>
    </span>
  );
}
