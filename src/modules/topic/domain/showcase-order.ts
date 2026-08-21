import { createHash } from "node:crypto";

/**
 * 투표 기간 동안 쇼케이스 목록을 섞을 때 쓰는 정렬 키.
 *
 * 고정 순서는 어느 쪽으로 정해도 형평성이 깨진다. 최신순이면 늦게 올린 팀이,
 * 오래된 순이면 일찍 올린 팀이 상단을 차지한다. 그래서 투표 기간에는 사람마다
 * 다른 순서로 보여 노출 이득을 흩는다.
 *
 * 같은 사람에게는 항상 같은 순서여야 한다. 매번 바뀌면 스크롤과 페이지 넘김이
 * 어긋나 이미 본 프로젝트를 다시 보게 된다. 그래서 무작위가 아니라 해시를 쓴다.
 */
export function showcaseShuffleKey(topicId: string, seed: string): string {
  return createHash("sha256").update(`${seed}:${topicId}`).digest("hex");
}

/** 시드가 있으면 사람마다 다른 순서로, 없으면 넘어온 순서를 그대로 둔다. */
export function orderShowcaseIds(topicIds: readonly string[], seed?: string): string[] {
  if (!seed) return [...topicIds];
  return [...topicIds].sort((left, right) =>
    showcaseShuffleKey(left, seed).localeCompare(showcaseShuffleKey(right, seed)));
}
