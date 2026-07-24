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

function professorInitial(name: string) {
  return [...name.trim()][0] ?? "P";
}

export function ProjectGalleryCover({ id, href, label, title, professorName }: {
  id: string;
  href: string;
  label: string;
  title: string;
  professorName: string;
}) {
  return (
    <>
      <div className={`${styles.cover} ${stableVariant(id)}`}>
        <span className={styles.programLabel}>{label}</span>
        <Link href={href} aria-label={`${title} 보기`} className={styles.coverLink} />
      </div>
      <div className={styles.professor}>
        <span aria-hidden="true" className={styles.professorMark}>{professorInitial(professorName)}</span>
        <span className={styles.professorName}>{professorName} 교수</span>
      </div>
    </>
  );
}
