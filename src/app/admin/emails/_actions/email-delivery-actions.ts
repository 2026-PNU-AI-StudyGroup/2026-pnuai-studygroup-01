"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type EmailDeliveryActionState = { status: "idle" | "error" | "success"; message: string };

const retrySchema = z.object({ id: z.string().uuid() });

export async function retryFailedEmailDeliveryAction(
  _state: EmailDeliveryActionState,
  formData: FormData,
): Promise<EmailDeliveryActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") return { status: "error", message: "관리자만 이메일 작업을 재등록할 수 있습니다." };
  const parsed = retrySchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { status: "error", message: "이메일 작업 정보를 확인해 주세요." };
  const result = await prisma.emailDelivery.updateMany({
    where: { id: parsed.data.id, status: "FAILED" },
    // 시도 횟수를 되돌리지 않으면 이미 한도에 닿은 값 그대로 다시 큐에 들어간다.
    // 일꾼이 집는 순간 한도를 넘겨 한 번 만에 다시 실패로 떨어졌다.
    data: { status: "PENDING", availableAt: new Date(), lockedAt: null, attempts: 0 },
  });
  if (result.count === 0) return { status: "error", message: "실패 상태인 이메일 작업만 재등록할 수 있습니다." };
  revalidatePath("/admin/emails");
  return { status: "success", message: "이메일 작업을 다시 대기열에 등록했습니다." };
}
