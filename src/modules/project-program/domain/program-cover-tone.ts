/**
 * 대표 이미지를 올리지 않은 프로젝트의 표지 색.
 *
 * 예전에는 모든 카드가 같은 회색이라 목록을 훑을 때 서로 구분되지 않았다. 프로젝트마다
 * 색을 달리 두면 제목을 읽기 전에 갈라 볼 수 있다.
 *
 * 색은 저장하지 않고 프로젝트 id 에서 매번 다시 만든다. 같은 프로젝트는 언제나 같은 색이고
 * 새로고침해도 바뀌지 않는다. 칸을 늘리거나 값을 손으로 골라 줄 일이 없다.
 *
 * 무작위 색이 아니라 정해 둔 여덟 가지 안에서만 고른다. 사이트 색과 따로 노는 카드가
 * 생기지 않게 하려는 것이다.
 */
export const PROGRAM_COVER_TONE_COUNT = 8;

export type ProgramCoverTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function programCoverTone(seed: string): ProgramCoverTone {
  // 문자열을 고르게 흩는 정도면 충분하다. 암호용이 아니라 색을 나누는 용도다.
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return (Math.abs(hash) % PROGRAM_COVER_TONE_COUNT) + 1 as ProgramCoverTone;
}
