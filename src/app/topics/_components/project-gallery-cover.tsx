import Link from "next/link";

import styles from "@/app/topics/_components/project-gallery.module.css";

const coverVariants = [
  styles.cover0,
  styles.cover1,
  styles.cover2,
  styles.cover3,
  styles.cover4,
  styles.cover5,
];

function stableVariant(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return coverVariants[hash % coverVariants.length];
}

export function ProjectGalleryCover({ id, href, label, title, professorName, authorSuffix = "교수" }: {
  id: string;
  href: string;
  label: string;
  title: string;
  professorName: string;
  authorSuffix?: string;
}) {
  return (
    <>
      <div className={`${styles.cover} ${stableVariant(id)}`}>
        <span className={styles.programLabel}>{label}</span>
        <Link href={href} aria-label={`${title} 보기`} className={styles.coverLink} />
      </div>
      <div className={styles.professor}>
        <span aria-hidden="true" className={styles.professorMark}>
          <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" />
          </svg>
        </span>
        <span className={styles.professorName}>{professorName} {authorSuffix}</span>
      </div>
    </>
  );
}
