import Image from "next/image";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import styles from "@/app/topics/_components/project-gallery.module.css";
import { programCoverTone } from "@/modules/project-program/domain/program-cover-tone";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { ProgramIcon } from "@/shared/ui/program-icon";

export function ProjectGalleryCover({ imagePath, programName, programIcon, title, divisionId, divisionName, teamName }: {
  imagePath?: string;
  programName: string;
  programIcon?: ProgramIconKey;
  title: string;
  /** 표지 첫 줄. 분과를 쓰는 프로그램은 분과가, 안 쓰면 프로그램 이름이 올라간다. */
  divisionName?: string | null;
  /** 표지 마지막 줄. 팀을 아직 안 꾸린 주제는 없어서 줄을 그리지 않는다. */
  teamName?: string | null;
  /**
   * 표지 색을 고르는 값.
   *
   * 분과 id 하나만 받는다. 같은 분과 프로젝트가 한 색으로 묶여 목록에서 덩어리로 보이고,
   * 색이 장식이 아니라 분과를 말하게 된다. 분과가 없으면 색을 입히지 않고 예전 회색으로
   * 둔다. 카드마다 색을 흩어 놓으면 목록이 요란해지기만 하고 무엇도 뜻하지 않는다.
   */
  divisionId?: string | null;
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
  // 프로그램이 고른 아이콘을 크게 얹고, 분과가 있으면 분과 색을 깐다. 색은 저장하지 않고
  // 분과 id 에서 매번 다시 만들기 때문에 칸을 늘리거나 이미지를 준비할 일이 없다.
  // 분과가 없으면 data-cover-tone 을 붙이지 않는다. CSS 변수가 비어 예전 회색으로 떨어진다.
  const tone = divisionId ? programCoverTone(divisionId) : undefined;
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
        <span className={styles.fallbackEyebrow}><UiText>{divisionName ?? programName}</UiText></span>
        <strong className={styles.fallbackTitle}><UiText>{title}</UiText></strong>
        {teamName ? <span className={styles.fallbackTeam}><UiText>{teamName}</UiText></span> : null}
      </div>
    </div>
  );
}
