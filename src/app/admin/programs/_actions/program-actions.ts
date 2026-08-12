"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ProgramVoteResetConfirmationRequiredError, ProjectProgramOperationError, ProjectProgramService, type ProgramVoteResetImpact } from "@/modules/project-program/application/manage-project-programs";
import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";
import { PROGRAM_ICON_KEYS } from "@/modules/project-program/domain/program-icon";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProgramActionState = { status: "idle" | "error" | "success" | "confirm"; message: string; voteResetImpact?: ProgramVoteResetImpact };
async function actor() { const value = await getCurrentActor(); if (!value) redirect("/sign-in"); return value; }
const service = () => new ProjectProgramService(new PrismaProjectProgramRepository(prisma));

const programIconSchema = z.enum(PROGRAM_ICON_KEYS);
const votingIdentityVisibilitySchema = z.enum(["ANONYMOUS", "NAMED"]);
const voteLimitScopeSchema = z.enum(["PROGRAM", "DIVISION"]);

const programSettingsSchema = z.object({
  name: z.string(),
  category: z.string(),
  description: z.string(),
  startsAt: koreanLocalDateTime,
  endsAt: koreanLocalDateTime,
  advisorEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  projectRegistrationStartsAt: koreanLocalDateTime,
  projectRegistrationEndsAt: koreanLocalDateTime,
  recruitmentStartsAt: koreanLocalDateTime,
  recruitmentEndsAt: koreanLocalDateTime,
  executionStartsAt: koreanLocalDateTime,
  executionEndsAt: koreanLocalDateTime,
  submissionStartsAt: koreanLocalDateTime,
  submissionEndsAt: koreanLocalDateTime,
  votingEnabled: z.boolean(),
  votingStartsAt: koreanLocalDateTime.optional(),
  votingEndsAt: koreanLocalDateTime.optional(),
  voteLimit: z.coerce.number().int().min(1).optional(),
  voteLimitScope: voteLimitScopeSchema.optional(),
  selfVotingAllowed: z.boolean(),
  confirmedVoteCount: z.coerce.number().int().min(1).optional(),
  confirmedVoteFromLimit: z.coerce.number().int().min(1).optional(),
  confirmedVoteFromScope: voteLimitScopeSchema.optional(),
  confirmedVoteLimit: z.coerce.number().int().min(1).optional(),
  confirmedVoteLimitScope: voteLimitScopeSchema.optional(),
  identityVisibility: votingIdentityVisibilitySchema.optional(),
}).superRefine((value, context) => {
  if (value.votingEnabled && (!value.votingStartsAt || !value.votingEndsAt || !value.voteLimit || !value.identityVisibility || !value.voteLimitScope)) {
    context.addIssue({ code: "custom", message: "투표 설정을 모두 입력해 주세요." });
  }
});

function parseProgramSettings(formData: FormData) {
  return programSettingsSchema.safeParse({
    ...Object.fromEntries(formData),
    votingEnabled: formData.get("votingEnabled") === "true",
    selfVotingAllowed: formData.get("selfVotingAllowed") === "true",
  });
}

export async function createProgramAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ name: z.string(), category: z.string(), description: z.string(), divisionNames: z.string(), startsAt: koreanLocalDateTime, endsAt: koreanLocalDateTime, icon: programIconSchema, advisorEnabled: z.enum(["true", "false"]).transform((value) => value === "true"), studentProjectCreationEnabled: z.boolean() }).safeParse({
    ...Object.fromEntries(formData),
    studentProjectCreationEnabled: formData.get("studentProjectCreationEnabled") === "true",
  });
  const settings = parseProgramSettings(formData);
  if (!parsed.success || !settings.success) return { status: "error", message: "프로그램 내용과 공통 일정·투표 기간을 확인해 주세요." };
  let programId: string;
  try {
    programId = await service().create(await actor(), {
      ...parsed.data,
      projectRegistrationStartsAt: settings.data.projectRegistrationStartsAt,
      projectRegistrationEndsAt: settings.data.projectRegistrationEndsAt,
      recruitmentStartsAt: settings.data.recruitmentStartsAt,
      recruitmentEndsAt: settings.data.recruitmentEndsAt,
      executionStartsAt: settings.data.executionStartsAt,
      executionEndsAt: settings.data.executionEndsAt,
      submissionStartsAt: settings.data.submissionStartsAt,
      submissionEndsAt: settings.data.submissionEndsAt,
      divisionNames: parsed.data.divisionNames.split(",").map((name) => name.trim()).filter(Boolean),
      votingPolicy: settings.data.votingEnabled ? {
        startsAt: settings.data.votingStartsAt!,
        endsAt: settings.data.votingEndsAt!,
        voteLimit: settings.data.voteLimit!,
        voteLimitScope: settings.data.voteLimitScope!,
        selfVotingAllowed: settings.data.selfVotingAllowed,
        identityVisibility: settings.data.identityVisibility!,
      } : null,
    });
  }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs");
  // 생성 직후 통합 관리 화면으로 보내 채점표·분과·공지 등 옵션을 이어서 설정하게 한다.
  redirect(`/admin/programs/${programId}`);
}

export async function updateProgramSettingsAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const programId = z.string().uuid().safeParse(formData.get("programId"));
  const settings = parseProgramSettings(formData);
  if (!programId.success || !settings.success) return { status: "error", message: "등록·공통 일정·투표 기간과 투표 정책을 확인해 주세요." };
  try {
    await service().updateSettings(await actor(), programId.data, {
      name: settings.data.name,
      category: settings.data.category,
      description: settings.data.description,
      startsAt: settings.data.startsAt,
      endsAt: settings.data.endsAt,
      advisorEnabled: settings.data.advisorEnabled,
      projectRegistrationStartsAt: settings.data.projectRegistrationStartsAt,
      projectRegistrationEndsAt: settings.data.projectRegistrationEndsAt,
      recruitmentStartsAt: settings.data.recruitmentStartsAt,
      recruitmentEndsAt: settings.data.recruitmentEndsAt,
      executionStartsAt: settings.data.executionStartsAt,
      executionEndsAt: settings.data.executionEndsAt,
      submissionStartsAt: settings.data.submissionStartsAt,
      submissionEndsAt: settings.data.submissionEndsAt,
      votingPolicy: settings.data.votingEnabled ? {
        startsAt: settings.data.votingStartsAt!,
        endsAt: settings.data.votingEndsAt!,
        voteLimit: settings.data.voteLimit!,
        voteLimitScope: settings.data.voteLimitScope!,
        selfVotingAllowed: settings.data.selfVotingAllowed,
        identityVisibility: settings.data.identityVisibility!,
      } : null,
      confirmVoteReset: settings.data.confirmedVoteCount && settings.data.confirmedVoteFromLimit && settings.data.confirmedVoteFromScope && settings.data.confirmedVoteLimit && settings.data.confirmedVoteLimitScope ? {
        voteCount: settings.data.confirmedVoteCount,
        from: { voteLimit: settings.data.confirmedVoteFromLimit, voteLimitScope: settings.data.confirmedVoteFromScope },
        to: { voteLimit: settings.data.confirmedVoteLimit, voteLimitScope: settings.data.confirmedVoteLimitScope },
      } : undefined,
    });
  } catch (error) {
    if (error instanceof ProgramVoteResetConfirmationRequiredError) return { status: "confirm", message: error.message, voteResetImpact: error.impact };
    if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${programId.data}`);
  revalidatePath("/topics");
  revalidatePath("/projects/new");
  revalidatePath("/professor/topics/new");
  revalidatePath("/project-approvals");
  return { status: "success", message: "프로그램 정보와 운영 설정을 저장했습니다." };
}

export async function changeProgramIconAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ programId: z.string().uuid(), icon: programIconSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "프로그램 아이콘을 다시 선택해 주세요." };
  try { await service().changeIcon(await actor(), parsed.data.programId, parsed.data.icon); }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs"); revalidatePath(`/admin/programs/${parsed.data.programId}`); revalidatePath("/topics"); revalidatePath("/dashboard");
  return { status: "success", message: "프로그램 아이콘을 변경했습니다." };
}

export async function changeStudentProjectCreationAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ programId: z.string().min(1).max(200), enabled: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "학생 프로젝트 제안 설정을 다시 확인해 주세요." };
  try { await service().changeStudentProjectCreation(await actor(), parsed.data.programId, parsed.data.enabled === "true"); }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs"); revalidatePath(`/admin/programs/${parsed.data.programId}`); revalidatePath("/topics"); revalidatePath("/projects/new");
  return { status: "success", message: parsed.data.enabled === "true" ? "학생 프로젝트 제안을 허용했습니다." : "학생 프로젝트 제안을 중지했습니다." };
}

export async function changeProgramStatusAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({
    programId: z.string().min(1).max(200),
    operation: z.enum(["SET_PUBLIC", "CLOSE"]),
    isPublic: z.enum(["true", "false"]).optional(),
  }).superRefine((value, context) => {
    if (value.operation === "SET_PUBLIC" && value.isPublic === undefined) context.addIssue({ code: "custom", message: "공개 설정을 확인해 주세요." });
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "변경할 프로그램 상태를 다시 확인해 주세요." };
  try {
    const currentActor = await actor();
    if (parsed.data.operation === "CLOSE") await service().close(currentActor, parsed.data.programId);
    else await service().setPublic(currentActor, parsed.data.programId, parsed.data.isPublic === "true");
  }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs"); revalidatePath(`/admin/programs/${parsed.data.programId}`); revalidatePath("/topics");
  return { status: "success", message: parsed.data.operation === "CLOSE" ? "프로그램 운영을 마감했습니다." : parsed.data.isPublic === "true" ? "프로그램을 공개했습니다." : "프로그램을 비공개로 전환했습니다." };
}
