import Image from "next/image";

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

export function ProjectGalleryCover({ id, imagePath }: {
  id: string;
  imagePath?: string;
}) {
  return (
    <div aria-hidden="true" data-project-cover className={`${styles.cover} ${stableVariant(id)}`}>
      {imagePath ? (
        <Image
          alt=""
          className={styles.coverImage}
          fill
          sizes="(min-width: 1536px) 27vw, (min-width: 768px) 42vw, 100vw"
          src={imagePath}
        />
      ) : null}
    </div>
  );
}
