"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { UserAdministrationError, UserAdministrationService } from "@/modules/identity/application/manage-users";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaUserAdministrationRepository } from "@/modules/identity/infrastructure/prisma-user-administration-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type UserStatusActionState = { status: "idle" | "error" | "success"; message: string };

const inputSchema = z.object({ userId: z.string().trim().min(1).max(200), isActive: z.enum(["true", "false"]) });

const roleInputSchema = z.object({ userId: z.string().trim().min(1).max(200), isAdmin: z.enum(["true", "false"]) });

export async function changeAdminRoleAction(_previous: UserStatusActionState, formData: FormData): Promise<UserStatusActionState> {
  const parsed = roleInputSchema.safeParse({ userId: formData.get("userId"), isAdmin: formData.get("isAdmin") });
  if (!parsed.success) return { status: "error", message: "사용자 정보를 확인해 주세요." };
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const isAdmin = parsed.data.isAdmin === "true";
  try {
    const outcome = await new UserAdministrationService(new PrismaUserAdministrationRepository(prisma)).setAdminRole(actor, parsed.data.userId, isAdmin);
    revalidatePath("/admin/users");
    if (outcome === "UNCHANGED") return { status: "success", message: "이미 같은 권한입니다." };
    return {
      status: "success",
      message: isAdmin
        ? "관리자 권한을 부여했습니다. 대상자가 다시 로그인하면 적용됩니다."
        : "관리자 권한을 해제했습니다. 로그인 상태도 함께 종료했습니다.",
    };
  } catch (error) {
    if (error instanceof UserAdministrationError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function changeUserStatusAction(_previous: UserStatusActionState, formData: FormData): Promise<UserStatusActionState> {
  const parsed = inputSchema.safeParse({ userId: formData.get("userId"), isActive: formData.get("isActive") });
  if (!parsed.success) return { status: "error", message: "사용자 정보를 확인해 주세요." };
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  try {
    const outcome = await new UserAdministrationService(new PrismaUserAdministrationRepository(prisma)).setActive(actor, parsed.data.userId, parsed.data.isActive === "true");
    revalidatePath("/admin/users");
    return outcome === "UNCHANGED"
      ? { status: "success", message: "이미 같은 상태입니다." }
      : { status: "success", message: parsed.data.isActive === "true" ? "계정을 다시 활성화했습니다." : "계정을 비활성화하고 로그인 상태를 종료했습니다." };
  } catch (error) {
    if (error instanceof UserAdministrationError) return { status: "error", message: error.message };
    throw error;
  }
}
