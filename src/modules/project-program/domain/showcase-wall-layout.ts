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
 * 새것부터 그냥 스물넷을 자르면 가장 최근 행사 하나가 벽을 다 먹는다. 실제로 제6회
 * 해커톤 표지가 스물넷을 그대로 채웠다. 프로그램을 번갈아 집으면 행사마다 자리가 돌아간다.
 * 프로그램 차례는 팀을 늦게 확정한 쪽이 먼저다. 다 떨어진 프로그램은 건너뛴다.
 */
export function pickShowcaseWallPaths(
  rows: readonly { programId: string; path: string }[],
): string[] {
  const queues = new Map<string, string[]>();
  for (const { programId, path } of rows) {
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
 * 받은 표지를 왼쪽 위부터 차례로 깐다.
 *
 * 표지가 칸보다 적으면 앞에서부터 다시 돌려 쓴다. 열 수와 나눠지지 않는 수만큼
 * 밀리므로 같은 그림이 옆이나 위아래로 붙지 않고 어긋난 줄로 흩어진다.
 * 표지가 하나도 없으면 빈 배열이다. 부르는 쪽이 손으로 만든 예비 그림으로 넘긴다.
 */
export function showcaseWallTiles(fileIds: readonly string[]): ShowcaseWallTile[] {
  if (fileIds.length === 0) return [];
  return Array.from({ length: SHOWCASE_WALL_TILE_COUNT }, (_unused, index) => ({
    fileId: fileIds[index % fileIds.length]!,
    left: (index % SHOWCASE_WALL_COLUMNS) * SHOWCASE_WALL_TILE_WIDTH,
    top: Math.floor(index / SHOWCASE_WALL_COLUMNS) * SHOWCASE_WALL_TILE_HEIGHT,
  }));
}
