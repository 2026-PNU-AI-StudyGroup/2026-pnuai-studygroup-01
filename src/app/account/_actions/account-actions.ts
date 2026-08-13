"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { StudentProfileForbiddenError, StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { AccountWithdrawalError, WithdrawAccountService } from "@/modules/identity/application/withdraw-account";
import { InvalidStudentProfileError } from "@/modules/identity/domain/student-profile";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { PrismaAccountWithdrawalRepository } from "@/modules/identity/infrastructure/prisma-account-withdrawal-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type StudentProfileActionState = { status: "idle" | "error" | "success"; message: string };
export type AccountWithdrawalActionState = { status: "idle" | "error"; message: string };

const schema = z.object({
  phone: z.string().max(40),
  kakao: z.string().max(200),
  github: z.string().max(200),
  instagram: z.string().max(200),
});

export async function saveStudentProfileAction(_state: StudentProfileActionState, formData: FormData): Promise<StudentProfileActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "입력 길이와 형식을 확인해 주세요." };
  try {
    await new StudentProfileService(new PrismaStudentProfileRepository(prisma)).save(actor, parsed.data);
  } catch (error) {
    if (error instanceof InvalidStudentProfileError || error instanceof StudentProfileForbiddenError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/account");
  revalidatePath("/teams");
  return { status: "success", message: "연락처를 저장했습니다." };
}

// 온보딩에서 받은 학사 정보(학과·학번·학년·자주 쓰는 이메일)를 마이페이지에서도 수정할 수 있게 한다.
const academicSchema = z.object({
  department: z.string().max(200),
  studentNumber: z.string().max(30),
  grade: z.coerce.number().int(),
  contactEmail: z.string().max(300),
});

export async function saveStudentAccountAction(_state: StudentProfileActionState, formData: FormData): Promise<StudentProfileActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") return { status: "error", message: "학생 계정만 학사 정보를 수정할 수 있습니다." };
  const parsed = academicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "학사 정보를 확인해 주세요." };
  const department = parsed.data.department.trim().replace(/\s+/g, " ");
  const studentNumber = parsed.data.studentNumber.replace(/[\s-]/g, "");
  const contactEmail = parsed.data.contactEmail.trim().toLowerCase();
  const grade = parsed.data.grade;
  if (
    department.length < 2 || department.length > 100 ||
    !/^\d{6,12}$/.test(studentNumber) ||
    grade < 1 || grade > 6 ||
    contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
  ) {
    return { status: "error", message: "학사 정보를 확인해 주세요." };
  }
  const duplicate = await prisma.user.findFirst({ where: { studentNumber, NOT: { id: actor.id } }, select: { id: true } });
  if (duplicate) return { status: "error", message: "이미 사용 중인 학번입니다." };
  await prisma.user.update({ where: { id: actor.id }, data: { department, studentNumber, grade, contactEmail } });
  revalidatePath("/account");
  revalidatePath("/teams");
  return { status: "success", message: "학사 정보를 저장했습니다." };
}

export async function withdrawAccountAction(
  _state: AccountWithdrawalActionState,
): Promise<AccountWithdrawalActionState> {
  void _state;
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  try {
    await new WithdrawAccountService(new PrismaAccountWithdrawalRepository(prisma)).execute(actor);
  } catch (error) {
    if (error instanceof AccountWithdrawalError) return { status: "error", message: error.message };
    throw error;
  }
  redirect("/sign-in?account=withdrawn");
}
