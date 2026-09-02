"use server";

import { revalidatePath } from "next/cache";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { saveProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 초기 상태 객체는 여기서 export 하지 않는다. "use server" 파일은 비동기 함수만 내보낼 수
// 있어서 값을 하나라도 얹으면 화면이 통째로 500 이 된다. 쓰는 쪽 컴포넌트에 둔다.
export type CategoryOrderActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function moveProgramCategoryAction(
  _previous: CategoryOrderActionState,
  formData: FormData,
): Promise<CategoryOrderActionState> {
  const actor = await getCurrentActor();
  if (!actor || actor.role !== "ADMIN") {
    return { status: "error", message: "관리자만 대분류 순서를 바꿀 수 있습니다." };
  }

  const target = String(formData.get("category") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const current = formData.getAll("order").filter((value): value is string => typeof value === "string");
  if (!target || (direction !== "up" && direction !== "down")) {
    return { status: "error", message: "옮길 대분류를 다시 확인해 주세요." };
  }

  const index = current.indexOf(target);
  const next = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || next < 0 || next >= current.length) {
    return { status: "error", message: "화면이 오래되었습니다. 새로 고쳐 주세요." };
  }
  const reordered = [...current];
  [reordered[index], reordered[next]] = [reordered[next]!, reordered[index]!];

  await saveProgramCategoryOrder(prisma, reordered);
  revalidatePath("/admin/categories");
  revalidatePath("/topics");
  return { status: "success", message: "대분류 순서를 바꿨습니다." };
}
