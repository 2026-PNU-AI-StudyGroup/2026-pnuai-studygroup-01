import type { PrismaClient } from "@/generated/prisma/client";

/** 운영자가 정해 둔 대분류 차례. 앞에서부터 화면에 세운다. */
export async function listProgramCategoryOrder(client: PrismaClient): Promise<string[]> {
  const rows = await client.programCategoryOrder.findMany({
    orderBy: { position: "asc" },
    select: { name: true },
  });
  return rows.map(({ name }) => name);
}

/**
 * 실제로 쓰이는 분류를 정해진 차례대로, 나머지는 뒤에 가나다순으로 붙여 돌려준다.
 * 관리 화면과 사이드바가 같은 목록을 보게 하려고 한 곳에 둔다.
 */
export async function listOrderedProgramCategories(client: PrismaClient): Promise<string[]> {
  const [used, order] = await Promise.all([
    client.projectProgram.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    listProgramCategoryOrder(client),
  ]);
  const names = used.map(({ category }) => category).filter((category) => category.trim().length > 0);
  const rank = new Map(order.map((category, index) => [category, index]));
  const unranked = rank.size;
  return names.sort((left, right) =>
    (rank.get(left) ?? unranked) - (rank.get(right) ?? unranked) || left.localeCompare(right, "ko"));
}

/**
 * 차례를 통째로 다시 적는다.
 *
 * 보낸 목록을 그대로 믿지 않는다. 화면이 낡은 사이에 새 분류가 생겼을 수 있어, 실제로
 * 쓰이는 분류와 맞춰 보고 빠진 것은 뒤에 붙인다. 낡은 화면이 새 분류를 지우지 못한다.
 */
export async function saveProgramCategoryOrder(client: PrismaClient, requested: readonly string[]): Promise<string[]> {
  const used = await client.projectProgram.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  const names = new Set(used.map(({ category }) => category).filter((category) => category.trim().length > 0));
  const ordered = [...new Set(requested)].filter((category) => names.has(category));
  for (const category of names) if (!ordered.includes(category)) ordered.push(category);

  await client.$transaction([
    client.programCategoryOrder.deleteMany({}),
    client.programCategoryOrder.createMany({
      data: ordered.map((name, position) => ({ name, position })),
    }),
  ]);
  return ordered;
}
