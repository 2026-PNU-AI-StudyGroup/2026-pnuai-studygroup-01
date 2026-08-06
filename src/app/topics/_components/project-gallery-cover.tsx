import Image from "next/image";
import { UiText } from "@/modules/translation/ui/i18n-provider";

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

export function ProjectGalleryCover({ id, imagePath, programName, title }: {
  id: string;
  imagePath?: string;
  programName: string;
  title: string;
}) {
  return (
    <div aria-hidden="true" data-project-cover className={imagePath ? `${styles.cover} ${stableVariant(id)}` : `${styles.cover} ${styles.fallbackCover}`}>
      {imagePath ? (
        <Image
          alt=""
          className={styles.coverImage}
          fill
          sizes="(min-width: 1536px) 27vw, (min-width: 768px) 42vw, 100vw"
          src={imagePath}
        />
      ) : (
        <>
          <span aria-hidden="true" data-pnu-mark className={styles.fallbackMark} />
          <div data-project-cover-fallback className={styles.fallbackContent}>
            <span className={styles.fallbackEyebrow}><UiText>{programName}</UiText></span>
            <strong className={styles.fallbackTitle}><UiText>{title}</UiText></strong>
          </div>
        </>
      )}
    </div>
  );
}
