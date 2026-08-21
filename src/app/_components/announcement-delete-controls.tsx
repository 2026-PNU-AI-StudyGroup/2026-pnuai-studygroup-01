import type { ReactNode } from "react";

import { DeleteAnnouncementForm } from "@/app/_components/delete-announcement-form";

/**
 * 공지 목록에 끼워 넣을 공지별 삭제 버튼.
 *
 * 프로그램 공지 목록은 모듈 계층 컴포넌트라 서버 액션을 쓰는 폼을 직접 가져올 수 없다.
 * 앱 계층에서 미리 만들어 넘긴다. 예전에는 프로그램 공지에 수정만 있고 삭제가 없었다.
 */
export function announcementDeleteControls(
  manageableAnnouncementIds: readonly string[],
  returnHref?: string,
): Record<string, ReactNode> {
  return Object.fromEntries(manageableAnnouncementIds.map((announcementId) => [
    announcementId,
    <DeleteAnnouncementForm key={announcementId} announcementId={announcementId} returnHref={returnHref} iconOnly />,
  ]));
}
