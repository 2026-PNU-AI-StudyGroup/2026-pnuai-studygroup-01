import Link from "next/link";
import type { ReactNode } from "react";

import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import styles from "@/app/topics/_components/project-gallery.module.css";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function ProjectGalleryCardShell({
  id,
  title,
  href,
  programName,
  divisionName,
  description,
  imagePath,
  coverStatus,
  coverOverlay,
  titleAside,
  details,
  actions,
}: {
  id: string;
  title: string;
  href: string;
  programName: string;
  divisionName?: string | null;
  description: string;
  imagePath?: string;
  coverStatus?: ReactNode;
  coverOverlay?: ReactNode;
  titleAside?: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = id;
  const programLabel = divisionName ? `${programName} · ${divisionName}` : programName;
  return (
    <article aria-labelledby={titleId} className={styles.card}>
      <div className="relative">
        <ProjectGalleryCover imagePath={imagePath} programName={programName} title={title} />
        {coverStatus ? <div className="pointer-events-none absolute left-3 top-3 z-[2] flex flex-wrap items-center gap-1.5">{coverStatus}</div> : null}
        {coverOverlay}
      </div>
      <div className={styles.body}>
        <div className="flex items-start justify-between gap-3">
          <h3 id={titleId} className="line-clamp-2 min-w-0 text-xl font-bold leading-7 tracking-[-0.03em]">
            <Link href={href} className={styles.titleLink}><UiText>{title}</UiText></Link>
          </h3>
          {titleAside}
        </div>
        <p className="mt-2 text-xs font-semibold text-[var(--primary)]">
          <UiText>{programLabel}</UiText>
        </p>
        {details}
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p>
        {actions ? <div className={`mt-auto pt-5 ${styles.actionLayer}`}>{actions}</div> : null}
      </div>
    </article>
  );
}
