import type { GithubThumbnailResult } from "@/modules/github-readme/infrastructure/github-thumbnail-import";
import type { ReadmeFailure } from "@/modules/github-readme/infrastructure/github-readme-client";

export const README_FAILURE_MESSAGES: Record<ReadmeFailure | "NO_REPO", string> = {
  NO_REPO: "GitHub 레포 주소를 확인해 주세요. 예: https://github.com/아이디/레포",
  NOT_FOUND: "레포를 열 수 없어요. 공개 레포인지 확인하거나 칸을 직접 채워 주세요.",
  NO_README: "README 가 없어요. 칸을 직접 채워 주세요.",
  UNAVAILABLE: "GitHub 응답이 늦어요. 잠시 뒤 다시 눌러 주세요.",
};

export const GITHUB_THUMBNAIL_MESSAGES: Record<Exclude<GithubThumbnailResult, "FILLED" | "SKIPPED">, string> = {
  ...README_FAILURE_MESSAGES,
  FORBIDDEN: "이 프로젝트의 대표 이미지를 바꿀 권한이 없습니다.",
  NO_IMAGE: "README 에서 쓸 수 있는 그림을 찾지 못했어요. 대표 이미지를 직접 올려 주세요.",
};
