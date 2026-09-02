import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  listOrderedProgramCategories,
  saveProgramCategoryOrder,
} from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";

function clientWith(used: string[], order: string[]) {
  const createMany = vi.fn(async () => ({ count: 0 }));
  const client = {
    projectProgram: {
      findMany: vi.fn(async () => used.map((category) => ({ category }))),
    },
    programCategoryOrder: {
      findMany: vi.fn(async () => order.map((name, position) => ({ name, position }))),
      deleteMany: vi.fn(),
      createMany,
    },
    $transaction: vi.fn(async () => []),
  } as unknown as PrismaClient;
  return { client, createMany };
}

describe("대분류 차례 저장소", () => {
  it("정해 둔 차례를 앞에, 나머지를 가나다순으로 뒤에 붙인다", async () => {
    const { client } = clientWith(["AI 부스터", "캡스톤", "해커톤"], ["해커톤"]);

    // 한글이 로마자보다 앞선다. ko 정렬 규칙이라 캡스톤이 AI 부스터보다 먼저다.
    await expect(listOrderedProgramCategories(client)).resolves.toEqual(["해커톤", "캡스톤", "AI 부스터"]);
  });

  it("쓰이지 않는 분류는 차례에서 걸러 낸다", async () => {
    // 마지막 프로그램이 빠져나가 사라진 분류의 행이 남아 있어도 화면에는 안 나온다.
    const { client } = clientWith(["캡스톤"], ["없어진 분류", "캡스톤"]);

    await expect(listOrderedProgramCategories(client)).resolves.toEqual(["캡스톤"]);
  });

  it("낡은 화면이 보낸 목록에 빠진 분류는 뒤에 붙여 지킨다", async () => {
    // 화면을 열어 둔 사이에 새 분류가 생겼을 수 있다. 보낸 목록을 그대로 믿으면 사라진다.
    const { client, createMany } = clientWith(["캡스톤", "해커톤", "새 분류"], []);

    await expect(saveProgramCategoryOrder(client, ["해커톤", "캡스톤"]))
      .resolves.toEqual(["해커톤", "캡스톤", "새 분류"]);
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { name: "해커톤", position: 0 },
        { name: "캡스톤", position: 1 },
        { name: "새 분류", position: 2 },
      ],
    });
  });

  it("이제 쓰이지 않는 이름은 저장하지 않는다", async () => {
    const { client, createMany } = clientWith(["캡스톤"], []);

    await saveProgramCategoryOrder(client, ["없어진 분류", "캡스톤"]);

    expect(createMany).toHaveBeenCalledWith({ data: [{ name: "캡스톤", position: 0 }] });
  });
});
