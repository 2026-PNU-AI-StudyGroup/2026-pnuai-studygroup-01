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

  it("표지가 몇 장이든 돌려 쓸 때 같은 그림이 옆이나 위아래에 붙지 않는다", () => {
    // 한 장만 있으면 방법이 없으니 두 장부터 본다. 예전에는 열 수 6으로 나누어떨어지는
    // 1·2·3·6장에서 위아래가 같은 그림이었다.
    for (let pool = 2; pool <= SHOWCASE_WALL_TILE_COUNT; pool += 1) {
      const tiles = showcaseWallTiles(ids(pool));
      expect(tiles).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
      for (const [index, tile] of tiles.entries()) {
        const column = index % SHOWCASE_WALL_COLUMNS;
        const right = column + 1 < SHOWCASE_WALL_COLUMNS ? tiles[index + 1] : undefined;
        const below = tiles[index + SHOWCASE_WALL_COLUMNS];
        expect({ pool, index, side: "가로", id: right?.fileId })
          .not.toEqual({ pool, index, side: "가로", id: tile.fileId });
        expect({ pool, index, side: "세로", id: below?.fileId })
          .not.toEqual({ pool, index, side: "세로", id: tile.fileId });
      }
    }
  });

  it("표지가 없으면 빈 배열이다", () => {
    expect(showcaseWallTiles([])).toEqual([]);
  });
});

describe("pickShowcaseWallPaths", () => {
  const rowsOf = (programId: string, count: number) =>
    Array.from({ length: count }, (_unused, index) => ({
      programId,
      title: `${programId}-${index}`,
      path: `${programId}-${index}`,
    }));

  it("한 회차가 벽을 다 먹지 못하게 번갈아 집는다", () => {
    // 새것부터 자르기만 하면 앞 회차가 칸을 다 채운다.
    const picked = pickShowcaseWallPaths([...rowsOf("sixth", 40), ...rowsOf("seventh", 16)]);

    expect(picked).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    expect(picked.filter((path) => path.startsWith("seventh"))).toHaveLength(SHOWCASE_WALL_TILE_COUNT / 2);
    expect(picked.slice(0, 4)).toEqual(["sixth-0", "seventh-0", "sixth-1", "seventh-1"]);
  });

  it("표지가 떨어진 회차는 건너뛰고 남은 쪽에서 채운다", () => {
    const picked = pickShowcaseWallPaths([...rowsOf("sixth", 40), ...rowsOf("seventh", 2)]);

    expect(picked).toHaveLength(SHOWCASE_WALL_TILE_COUNT);
    expect(picked.filter((path) => path.startsWith("seventh"))).toEqual(["seventh-0", "seventh-1"]);
  });

  it("같은 이름의 프로젝트는 한 번만 쓴다", () => {
    // 같은 행사가 프로그램으로 두 번 들어가 있으면 표지 파일이 둘로 갈린다.
    const picked = pickShowcaseWallPaths([
      { programId: "sixth-a", title: "ForinK", path: "file-1" },
      { programId: "sixth-b", title: "ForinK", path: "file-2" },
      { programId: "sixth-b", title: "Moti", path: "file-3" },
    ]);

    expect(picked).toEqual(["file-1", "file-3"]);
  });

  it("전부 합쳐도 칸보다 적으면 있는 것만 돌려준다", () => {
    expect(pickShowcaseWallPaths(rowsOf("seventh", 3))).toEqual(["seventh-0", "seventh-1", "seventh-2"]);
    expect(pickShowcaseWallPaths([])).toEqual([]);
  });
});
