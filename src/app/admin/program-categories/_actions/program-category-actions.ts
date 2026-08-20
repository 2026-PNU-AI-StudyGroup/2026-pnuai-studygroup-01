"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProgramCategoryActionState = { status: "idle" | "error" | "success"; message: string };

const renameSchema = z.object({
  from: z.string().trim().min(1).max(100),
  to: z.string().trim().min(1).max(100),
});

// 분류는 별도 테이블이 아니라 프로그램의 문자열 하나다. 이름을 바꾸려면 그 분류를 쓰는
// 프로그램을 모두 함께 고쳐야 한다. 이미 있는 이름을 넣으면 두 분류가 하나로 합쳐진다.
export async function renameProgramCategoryAction(
  _state: ProgramCategoryActionState,
  formData: FormData,
): Promise<ProgramCategoryActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") return { status: "error", message: "관리자만 프로그램 분류를 바꿀 수 있습니다." };
  const parsed = renameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "분류 이름을 확인해 주세요." };
  const { from, to } = parsed.data;
  if (from === to) return { status: "error", message: "새 이름이 기존 이름과 같습니다." };

  const merging = await prisma.projectProgram.count({ where: { category: to } });
  const { count } = await prisma.projectProgram.updateMany({
    where: { category: from },
    data: { category: to },
  });
  if (count === 0) return { status: "error", message: "이미 사라진 분류입니다. 목록을 새로 고쳐 주세요." };

  revalidatePath("/admin/program-categories");
  revalidatePath("/topics");
  return {
    status: "success",
    message: merging > 0
      ? `프로그램 ${count}개를 ${to} 분류로 합쳤습니다.`
      : `프로그램 ${count}개의 분류를 ${to} 로 바꿨습니다.`,
  };
}
