import { listOrderedProgramCategories } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 기존 프로그램에서 실제 쓰인 분류(대분류) 목록. 분류 드롭다운의 선택지로 쓴다.
// 사이드바와 같은 차례로 보여 준다. 운영자가 세워 둔 순서를 여기서만 뒤집으면 헷갈린다.
export async function listProgramCategories(): Promise<string[]> {
  return listOrderedProgramCategories(prisma);
}
