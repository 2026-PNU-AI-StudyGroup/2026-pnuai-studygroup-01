import Image from "next/image";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import styles from "@/app/topics/_components/project-gallery.module.css";
import { programCoverTone } from "@/modules/project-program/domain/program-cover-tone";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { ProgramIcon } from "@/shared/ui/program-icon";

export function ProjectGalleryCover({ imagePath, programName, programIcon, title, seed }: {
  imagePath?: string;
  programName: string;
  programIcon?: ProgramIconKey;
  title: string;
  /** 표지 색을 고르는 씨앗. 프로젝트 id 를 넣는다. */
  seed?: string;
}) {
  if (imagePath) {
    return (
      <div aria-hidden="true" data-project-cover className={styles.cover}>
        {/* /api/files 는 로그인 쿠키를 요구한다. 이미지 최적화 서버는 쿠키 없이 가져가 401 을 받는다. */}
        <Image
          alt=""
          className={styles.coverImage}
          fill
          sizes="(min-width: 1536px) 27vw, (min-width: 768px) 42vw, 100vw"
          src={imagePath}
          unoptimized
        />
      </div>
    );
  }

  // 대표 이미지를 안 올린 프로젝트의 기본 표지.
  //
  // 예전에는 전부 같은 회색에 PNU 심볼만 박혀 있어 목록을 훑을 때 카드가 구분되지 않았다.
  // 프로젝트 id 로 색을 고르고 프로그램이 고른 아이콘을 크게 얹는다. 색은 저장하지 않고
  // 매번 다시 만들기 때문에 칸을 늘리거나 이미지를 준비할 일이 없다.
  const tone = programCoverTone(seed ?? title);
  return (
    <div
      aria-hidden="true"
      data-project-cover
      data-cover-tone={tone}
      className={`${styles.cover} ${styles.fallbackCover}`}
    >
      {programIcon ? (
        <ProgramIcon icon={programIcon} className={styles.fallbackIcon} />
      ) : (
        <span aria-hidden="true" data-pnu-mark className={styles.fallbackMark} />
      )}
      <div data-project-cover-fallback className={styles.fallbackContent}>
        <span className={styles.fallbackEyebrow}><UiText>{programName}</UiText></span>
        <strong className={styles.fallbackTitle}><UiText>{title}</UiText></strong>
      </div>
    </div>
  );
}
