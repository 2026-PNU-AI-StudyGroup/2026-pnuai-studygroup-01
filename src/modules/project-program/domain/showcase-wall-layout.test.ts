import { describe, expect, it } from "vitest";

import {
  SHOWCASE_WALL_COLUMNS,
  SHOWCASE_WALL_TILE_COUNT,
  SHOWCASE_WALL_TILE_HEIGHT,
  SHOWCASE_WALL_TILE_WIDTH,
  pickShowcaseWallPaths,
  showcaseWallTiles,
} from "@/modules/project-program/domain/showcase-wall-layout";

const ids = (count: number) => Array.from({ length: count }, (_unused, index) => `file-${index}`);

describe("showcaseWallTiles", () => {
  it("표지가 칸만큼 있으면 왼쪽 위부터 차례로 깐다", () => {
    const tiles = showcaseWallTiles(ids(SHOWCASE_WALL_TILE_COUNT));

    expect(tiles).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    expect(tiles[0]).toEqual({ fileId: "file-0", left: 0, top: 0 });
    expect(tiles[1]).toEqual({ fileId: "file-1", left: SHOWCASE_WALL_TILE_WIDTH, top: 0 });
    expect(tiles[SHOWCASE_WALL_COLUMNS]).toEqual({
      fileId: `file-${SHOWCASE_WALL_COLUMNS}`,
      left: 0,
      top: SHOWCASE_WALL_TILE_HEIGHT,
    });
  });

  it("칸보다 많이 받으면 앞에서부터 칸 수만큼만 쓴다", () => {
    const tiles = showcaseWallTiles(ids(SHOWCASE_WALL_TILE_COUNT + 9));

    expect(tiles).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    expect(tiles.at(-1)?.fileId).toBe(`file-${SHOWCASE_WALL_TILE_COUNT - 1}`);
  });

  it("표지가 적으면 돌려 쓰되 같은 그림을 옆에 붙이지 않는다", () => {
    // 열 수와 나눠지지 않는 수라 줄마다 한 칸씩 밀린다.
    const tiles = showcaseWallTiles(ids(5));

    expect(tiles).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    for (let index = 1; index < tiles.length; index += 1) {
      expect(tiles[index]!.fileId).not.toBe(tiles[index - 1]!.fileId);
    }
    const above = tiles.slice(SHOWCASE_WALL_COLUMNS);
    for (const [index, tile] of above.entries()) {
      expect(tile.fileId).not.toBe(tiles[index]!.fileId);
    }
  });

  it("표지가 없으면 빈 배열이다", () => {
    expect(showcaseWallTiles([])).toEqual([]);
  });
});

describe("pickShowcaseWallPaths", () => {
  const rowsOf = (programId: string, count: number) =>
    Array.from({ length: count }, (_unused, index) => ({ programId, path: `${programId}-${index}` }));

  it("한 프로그램이 벽을 다 먹지 못하게 번갈아 집는다", () => {
    // 새것부터 자르기만 하면 앞 프로그램이 칸을 다 채운다.
    const picked = pickShowcaseWallPaths([...rowsOf("hackathon", 40), ...rowsOf("booster", 16)]);

    expect(picked).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    expect(picked.filter((path) => path.startsWith("booster"))).toHaveLength(SHOWCASE_WALL_TILE_COUNT / 2);
    expect(picked.slice(0, 4)).toEqual(["hackathon-0", "booster-0", "hackathon-1", "booster-1"]);
  });

  it("떨어진 프로그램은 건너뛰고 남은 쪽에서 채운다", () => {
    const picked = pickShowcaseWallPaths([...rowsOf("hackathon", 40), ...rowsOf("booster", 2)]);

    expect(picked).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    expect(picked.filter((path) => path.startsWith("booster"))).toEqual(["booster-0", "booster-1"]);
  });

  it("전부 합쳐도 칸보다 적으면 있는 것만 돌려준다", () => {
    expect(pickShowcaseWallPaths(rowsOf("booster", 3))).toEqual(["booster-0", "booster-1", "booster-2"]);
    expect(pickShowcaseWallPaths([])).toEqual([]);
  });
});
