/**
 * 대표 이미지를 올리지 않은 프로젝트의 표지 색.
 *
 * 씨앗은 분과 id 하나뿐이다. 같은 분과가 한 색으로 묶여 목록이 덩어리로 읽히고, 색이
 * 장식이 아니라 분과를 말하게 된다. 분과가 없는 프로젝트는 이 함수를 부르지 않고 예전
 * 회색으로 둔다. 카드마다 색을 흩어 놓으면 요란하기만 하고 아무것도 뜻하지 않는다.
 *
 * 색은 저장하지 않고 씨앗에서 매번 다시 만든다. 같은 씨앗은 언제나 같은 색이고
 * 새로고침해도 바뀌지 않는다. 칸을 늘리거나 값을 손으로 골라 줄 일이 없다.
 *
 * 무작위 색이 아니라 정해 둔 여덟 가지 안에서만 고른다. 사이트 색과 따로 노는 카드가
 * 생기지 않게 하려는 것이다. 분과가 아홉 개를 넘으면 색이 겹치는데 그냥 둔다.
 */
export const PROGRAM_COVER_TONE_COUNT = 8;

export type ProgramCoverTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function programCoverTone(seed: string): ProgramCoverTone {
  // FNV-1a 뒤에 섞는 단계를 한 번 더 둔다.
  //
  // 흔한 `hash * 31 + charCode` 는 낮은 자리가 마지막 몇 글자에 끌려간다. 씨앗이 UUID 라
  // 글자가 16가지뿐이어서 8로 나눈 나머지가 몇 군데로 쏠렸다. 실제로 16개를 만들어 보니
  // 여덟 색 중 다섯만 나왔고 하나가 여섯 번 겹쳤다. 섞는 단계가 높은 자리를 낮은 자리로
  // 끌어내려 준다.
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return ((hash >>> 0) % PROGRAM_COVER_TONE_COUNT) + 1 as ProgramCoverTone;
}
