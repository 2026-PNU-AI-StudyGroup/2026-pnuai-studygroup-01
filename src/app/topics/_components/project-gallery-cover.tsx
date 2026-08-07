import Image from "next/image";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import styles from "@/app/topics/_components/project-gallery.module.css";

export function ProjectGalleryCover({ imagePath, programName, title }: {
  imagePath?: string;
  programName: string;
  title: string;
}) {
  return (
    <div aria-hidden="true" data-project-cover className={imagePath ? styles.cover : `${styles.cover} ${styles.fallbackCover}`}>
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
