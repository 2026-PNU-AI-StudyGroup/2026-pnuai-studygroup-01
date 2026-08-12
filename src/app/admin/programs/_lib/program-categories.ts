import { prisma } from "@/shared/infrastructure/database/prisma";

// 기존 프로그램에서 실제 쓰인 분류(대분류) 목록 — 중복 제거, 가나다순.
// 분류 드롭다운의 선택지로 사용한다.
export async function listProgramCategories(): Promise<string[]> {
  const rows = await prisma.projectProgram.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((row) => row.category).filter((category) => category.trim().length > 0);
}
