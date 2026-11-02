import type { AnnouncementVisibility } from "@/modules/announcement/application/announcement-ports";

/** 공지 대상(전체, 프로그램, 팀)과 실제로 읽을 수 있는 사람. 상세 화면의 받는 사람 칸이 쓴다. */
export function announcementScope({ teamName, programName, visibility }: {
  teamName: string | null;
  programName: string | null;
  visibility: AnnouncementVisibility;
}) {
  return {
    target: teamName ?? programName ?? "시스템 전체",
    audience: visibility === "AUTHENTICATED" ? "전체 공개" : teamName ? "팀 구성원" : "프로그램 구성원",
  };
}
