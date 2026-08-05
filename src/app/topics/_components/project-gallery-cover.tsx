import Image from "next/image";

import { UiLink } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { AccountIcon } from "@/shared/ui/workspace-icons";

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

export function ProjectGalleryCover({ id, href, label, title, professorName, authorSuffix = "교수", imagePath }: {
  id: string;
  href?: string;
  label?: string;
  title?: string;
  professorName?: string;
  authorSuffix?: string;
  imagePath?: string;
}) {
  const interactive = Boolean(href && title);

  return (
    <>
      <div aria-hidden={interactive ? undefined : true} data-project-cover className={`${styles.cover} ${stableVariant(id)}`}>
        {imagePath ? (
          <Image
            alt=""
            className={styles.coverImage}
            fill
            sizes="(min-width: 1536px) 27vw, (min-width: 768px) 42vw, 100vw"
            src={imagePath}
          />
        ) : null}
        {label ? <span className={styles.programLabel}><UiText>{label}</UiText></span> : null}
        {href && title ? <UiLink href={href} aria-label={`${title} 보기`} className={styles.coverLink} /> : null}
      </div>
      {professorName ? <div className={styles.professor}>
        <span aria-hidden="true" className={styles.professorMark}>
          <AccountIcon className="size-5" />
        </span>
        <span className={styles.professorName}>{professorName} {authorSuffix}</span>
      </div> : null}
    </>
  );
}
