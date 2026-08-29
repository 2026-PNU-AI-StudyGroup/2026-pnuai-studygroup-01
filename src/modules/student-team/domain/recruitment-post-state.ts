/**
 * 모집 공고와 그 지원서의 실제 상태.
 *
 * `status` 컬럼만으로는 부족하다. 마감일이 지나면 컬럼이 `OPEN` 이어도 더 이상 열린
 * 공고가 아니다. 크론이 컬럼을 닫아 주지만 마감 시각과 다음 실행 사이에 창이 있어,
 * 읽는 쪽은 컬럼이 아니라 항상 이 함수로 판단한다.
 *
 * 이 규칙이 네 곳에 각자 복사돼 있었고 그 중 한 곳만 지원서 라벨까지 반영했다. 그래서
 * 같은 화면에 "받은 지원 0" 과 "대기 1명" 이 함께 떴다.
 */

export type RecruitmentPostState = "OPEN" | "CLOSED";

type PostTiming = { status: string; deadlineAt: Date };

export function recruitmentPostState(post: PostTiming, now: Date): RecruitmentPostState {
  return post.status === "OPEN" && post.deadlineAt > now ? "OPEN" : "CLOSED";
}

/** 열린 공고만 새 지원을 받고, 팀장이 수락·거절할 수 있다. */
export function acceptsRecruitmentDecision(post: PostTiming, now: Date): boolean {
  return recruitmentPostState(post, now) === "OPEN";
}

/**
 * 지원서에 보여 줄 상태.
 *
 * 닫힌 공고에 남은 대기 지원은 거절이 아니라 "모집 종료" 다. 팀장이 실제로 거절한 것과
 * 공고가 끝나 자연히 끊긴 것을 구분한다.
 */
export function recruitmentApplicationState<T extends string>(
  applicationStatus: T,
  post: PostTiming,
  now: Date,
): T | "CLOSED" {
  return applicationStatus === "PENDING" && recruitmentPostState(post, now) === "CLOSED"
    ? "CLOSED"
    : applicationStatus;
}

/**
 * 팀장 화면에 "대기" 로 셀 수 있는 지원 수.
 *
 * 닫힌 공고의 대기 지원은 팀장이 손쓸 수 없으므로 대기로 세지 않는다. 받은 지원 목록이
 * 이미 그렇게 걸러 내므로, 세는 쪽도 같은 기준을 써야 숫자가 어긋나지 않는다.
 */
export function actionableRecruitmentApplicationCount(
  post: PostTiming,
  pendingCount: number,
  now: Date,
): number {
  return acceptsRecruitmentDecision(post, now) ? pendingCount : 0;
}
