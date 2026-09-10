/**
 * 랜딩 배경 벽의 칸 배치.
 *
 * 벽은 한 장짜리 그림이고 CSS 가 그것을 반복 배경으로 깐 뒤 정확히 한 장만큼 옮긴다.
 * 되돌아오는 자리에 같은 그림이 놓이므로 이음매가 보이지 않는다. 그래서 칸 수와 칸
 * 크기는 CSS 의 `--block-w`, `--block-h` 와 맞물려 있다. 여기를 고치면 그쪽도 고쳐야 한다.
 */
export const SHOWCASE_WALL_COLUMNS = 6;
export const SHOWCASE_WALL_ROWS = 4;
export const SHOWCASE_WALL_TILE_WIDTH = 460;
export const SHOWCASE_WALL_TILE_HEIGHT = 292;
export const SHOWCASE_WALL_TILE_COUNT = SHOWCASE_WALL_COLUMNS * SHOWCASE_WALL_ROWS;
export const SHOWCASE_WALL_WIDTH = SHOWCASE_WALL_COLUMNS * SHOWCASE_WALL_TILE_WIDTH;
export const SHOWCASE_WALL_HEIGHT = SHOWCASE_WALL_ROWS * SHOWCASE_WALL_TILE_HEIGHT;

/**
 * 프로그램을 돌아가며 하나씩 골라 칸을 채운다.
 *
 * 새것부터 그냥 스물넷을 자르면 가장 최근 회차 하나가 벽을 다 먹는다. 실제로 제6회
 * 해커톤 표지가 스물넷을 그대로 채웠다. 프로그램을 번갈아 집으면 회차마다 자리가 돌아간다.
 * 프로그램 차례는 팀을 늦게 확정한 쪽이 먼저다. 다 떨어진 프로그램은 건너뛴다.
 *
 * 같은 이름의 프로젝트는 한 번만 쓴다. 같은 행사가 프로그램으로 두 번 들어가 있으면
 * 표지 파일이 둘로 갈려 벽에 같은 그림이 짝으로 보인다. 파일 id 로는 못 걸러 이름으로 건다.
 */
export function pickShowcaseWallPaths(
  rows: readonly { programId: string; title: string; path: string }[],
): string[] {
  const queues = new Map<string, string[]>();
  const seenTitles = new Set<string>();
  for (const { programId, title, path } of rows) {
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    const queue = queues.get(programId);
    if (queue) queue.push(path);
    else queues.set(programId, [path]);
  }
  const picked: string[] = [];
  for (let round = 0; picked.length < SHOWCASE_WALL_TILE_COUNT; round += 1) {
    const before = picked.length;
    for (const queue of queues.values()) {
      if (picked.length >= SHOWCASE_WALL_TILE_COUNT) break;
      const next = queue[round];
      if (next !== undefined) picked.push(next);
    }
    if (picked.length === before) break;
  }
  return picked;
}

export type ShowcaseWallTile = {
  fileId: string;
  left: number;
  top: number;
};

/**
 * 줄을 바꿀 때마다 건너뛰는 칸 수.
 *
 * 그냥 순서대로 깔면 세로로 이웃한 칸의 간격이 열 수인 6이 된다. 표지가 6장이거나 그
 * 약수(1·2·3)면 6으로 나누어떨어져 위아래가 같은 그림이 된다. 표지 6장에서 열여덟 군데가
 * 붙었다. 줄마다 23칸을 더 밀면 세로 간격이 29가 된다. 29는 칸 수 24보다 큰 소수라
 * 표지가 몇 장이든 나누어떨어지지 않는다. 가로 간격은 언제나 1이라 원래 안 겹친다.
 * 표지가 한 장뿐이면 어차피 방법이 없다.
 */
const ROW_STEP = 23;

/**
 * 받은 표지를 왼쪽 위부터 차례로 깐다.
 *
 * 표지가 칸보다 적으면 앞에서부터 다시 돌려 쓰되 줄마다 밀어서 같은 그림이 옆이나
 * 위아래로 붙지 않게 한다.
 * 표지가 하나도 없으면 빈 배열이다. 부르는 쪽이 손으로 만든 예비 그림으로 넘긴다.
 */
export function showcaseWallTiles(fileIds: readonly string[]): ShowcaseWallTile[] {
  if (fileIds.length === 0) return [];
  // 칸을 채우고도 남으면 앞에서부터 그대로 쓴다. 밀어 봐야 뒤쪽 표지를 버리고 앞쪽을
  // 두 번 쓰게 될 뿐이다. 모자랄 때만 민다.
  const cycling = fileIds.length < SHOWCASE_WALL_TILE_COUNT;
  return Array.from({ length: SHOWCASE_WALL_TILE_COUNT }, (_unused, index) => {
    const row = Math.floor(index / SHOWCASE_WALL_COLUMNS);
    return {
      fileId: fileIds[cycling ? (index + row * ROW_STEP) % fileIds.length : index]!,
      left: (index % SHOWCASE_WALL_COLUMNS) * SHOWCASE_WALL_TILE_WIDTH,
      top: row * SHOWCASE_WALL_TILE_HEIGHT,
    };
  });
}
