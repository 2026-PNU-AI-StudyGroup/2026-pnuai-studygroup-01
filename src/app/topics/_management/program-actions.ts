"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ProgramDivisionSyncConfirmationRequiredError, ProgramVoteResetConfirmationRequiredError, ProjectProgramOperationError, ProjectProgramService, type ProgramDivisionSyncImpact, type ProgramVoteResetImpact } from "@/modules/project-program/application/manage-project-programs";
import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";
import { PROGRAM_ICON_KEYS } from "@/modules/project-program/domain/program-icon";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { programManagementHref } from "@/modules/project-program/ui/program-management-route";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProgramActionState = { status: "idle" | "error" | "success" | "confirm"; message: string; voteResetImpact?: ProgramVoteResetImpact; divisionSyncImpact?: ProgramDivisionSyncImpact; savedAdvisorEnabled?: boolean };
async function actor() { const value = await getCurrentActor(); if (!value) redirect("/sign-in"); return value; }
const service = () => new ProjectProgramService(new PrismaProjectProgramRepository(prisma));

const programIconSchema = z.enum(PROGRAM_ICON_KEYS);
const programVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);
const voteLimitScopeSchema = z.enum(["PROGRAM", "DIVISION"]);
const programCreateRubricSchema = z.object({
  divisionName: z.string().nullable(),
  title: z.string().trim().min(1).max(100),
  gradingDueAt: koreanLocalDateTime,
  audience: z.enum(["STAFF_ONLY", "TEAM_MEMBERS"]),
  criteria: z.array(z.object({ label: z.string().trim().min(1).max(60), maxPoints: z.coerce.number().int().min(1).max(100) })).min(1).max(50),
});
const programCreateDefinitionsSchema = z.object({
  rubricDefinitions: z.array(programCreateRubricSchema).max(30),
  reportDefinitions: z.array(z.object({ title: z.string().trim().min(1).max(100), dueAt: koreanLocalDateTime })).max(30),
});

const programSettingsSchema = z.object({
  name: z.string(),
  category: z.string().trim().min(1),
  description: z.string(),
  startsAt: koreanLocalDateTime,
  endsAt: koreanLocalDateTime,
  advisorEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  projectRegistrationStartsAt: koreanLocalDateTime,
  projectRegistrationEndsAt: koreanLocalDateTime,
  recruitmentStartsAt: koreanLocalDateTime.optional(),
  recruitmentEndsAt: koreanLocalDateTime.optional(),
  executionStartsAt: koreanLocalDateTime,
  executionEndsAt: koreanLocalDateTime,
  submissionStartsAt: koreanLocalDateTime,
  submissionEndsAt: koreanLocalDateTime,
  votingEnabled: z.boolean(),
  votingStartsAt: koreanLocalDateTime.optional(),
  votingEndsAt: koreanLocalDateTime.optional(),
  voteLimit: z.coerce.number().int().min(1).optional(),
  staffVoteLimit: z.coerce.number().int().min(1).default(5),
  voteLimitScope: voteLimitScopeSchema.optional(),
  selfVotingAllowed: z.boolean(),
  resultsVisibleDuringVoting: z.boolean(),
  resultsVisibleAfterVoting: z.boolean(),
  confirmedVoteCount: z.coerce.number().int().min(1).optional(),
  confirmedVoteFromLimit: z.coerce.number().int().min(1).optional(),
  confirmedVoteFromScope: voteLimitScopeSchema.optional(),
  confirmedVoteLimit: z.coerce.number().int().min(1).optional(),
  confirmedVoteLimitScope: voteLimitScopeSchema.optional(),
}).superRefine((value, context) => {
  if (value.votingEnabled && (!value.votingStartsAt || !value.votingEndsAt || !value.voteLimit || !value.voteLimitScope)) {
    context.addIssue({ code: "custom", message: "투표 설정을 모두 입력해 주세요." });
  }
});

const programIdSchema = z.string().uuid();
const programBasicInfoSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(5000),
  visibility: programVisibilitySchema,
  divisionNames: z.string(),
  confirmedDivisionIds: z.string().optional(),
  confirmedDivisionProjectCount: z.coerce.number().int().min(0).optional(),
  confirmedDivisionVoteCount: z.coerce.number().int().min(0).optional(),
  confirmedDivisionSwitchesVotingScope: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});
const programOperationSchema = z.object({
  advisorEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  projectTeamMinSize: z.coerce.number().int().min(1).max(100),
  projectTeamMaxSize: z.coerce.number().int().min(1).max(100),
  operationIntent: z.enum(["FULL", "ADVISOR_ONLY"]).default("FULL"),
});
const programScheduleSchema = z.object({
  startsAt: koreanLocalDateTime,
  endsAt: koreanLocalDateTime,
  projectRegistrationStartsAt: koreanLocalDateTime,
  projectRegistrationEndsAt: koreanLocalDateTime,
  recruitmentStartsAt: koreanLocalDateTime.optional(),
  recruitmentEndsAt: koreanLocalDateTime.optional(),
  executionStartsAt: koreanLocalDateTime,
  executionEndsAt: koreanLocalDateTime,
  targetMode: z.enum(["CURRENT", "DIRECT"]).default("CURRENT"),
});
const programVotingSchema = z.object({
  votingEnabled: z.boolean(),
  votingStartsAt: koreanLocalDateTime.optional(),
  votingEndsAt: koreanLocalDateTime.optional(),
  voteLimit: z.coerce.number().int().min(1).optional(),
  staffVoteLimit: z.coerce.number().int().min(1).default(5),
  voteLimitScope: voteLimitScopeSchema.optional(),
  selfVotingAllowed: z.boolean(),
  resultsVisibleDuringVoting: z.boolean(),
  resultsVisibleAfterVoting: z.boolean(),
  confirmedVoteCount: z.coerce.number().int().min(1).optional(),
  confirmedVoteFromLimit: z.coerce.number().int().min(1).optional(),
  confirmedVoteFromScope: voteLimitScopeSchema.optional(),
  confirmedVoteLimit: z.coerce.number().int().min(1).optional(),
  confirmedVoteLimitScope: voteLimitScopeSchema.optional(),
}).superRefine((value, context) => {
  if (value.votingEnabled && (!value.votingStartsAt || !value.votingEndsAt || !value.voteLimit || !value.voteLimitScope)) {
    context.addIssue({ code: "custom", message: "투표 설정을 모두 입력해 주세요." });
  }
});

function parseProgramSettings(formData: FormData, options?: { useExecutionPeriodAsSubmissionPeriod?: boolean }) {
  const entries = Object.fromEntries(formData);
  return programSettingsSchema.safeParse({
    ...entries,
    ...(options?.useExecutionPeriodAsSubmissionPeriod ? {
      submissionStartsAt: entries.executionStartsAt,
      submissionEndsAt: entries.executionEndsAt,
    } : {}),
    votingEnabled: formData.get("votingEnabled") === "true",
    selfVotingAllowed: formData.get("selfVotingAllowed") === "true",
    resultsVisibleDuringVoting: parseExplicitBoolean(formData.get("resultsVisibleDuringVoting"), false),
    resultsVisibleAfterVoting: parseExplicitBoolean(formData.get("resultsVisibleAfterVoting"), true),
  });
}

function parseExplicitBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function refreshManagement(programId: string, tab: Parameters<typeof programManagementHref>[1] = "settings") {
  revalidatePath("/topics");
  revalidatePath(programManagementHref(programId, tab));
  revalidatePath(programManagementHref(programId));
}

function managementFormData(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    votingEnabled: formData.get("votingEnabled") === "true",
    selfVotingAllowed: formData.get("selfVotingAllowed") === "true",
    resultsVisibleDuringVoting: parseExplicitBoolean(formData.get("resultsVisibleDuringVoting"), false),
    resultsVisibleAfterVoting: parseExplicitBoolean(formData.get("resultsVisibleAfterVoting"), true),
  };
}

export async function updateProgramBasicInfoAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const programId = programIdSchema.safeParse(formData.get("programId"));
  const input = programBasicInfoSchema.safeParse(Object.fromEntries(formData));
  if (!programId.success || !input.success) return { status: "error", message: "프로그램 기본 정보를 다시 확인해 주세요." };
  try {
    await service().updateBasicInfo(await actor(), programId.data, {
      name: input.data.name,
      category: input.data.category,
      description: input.data.description,
      isPublic: input.data.visibility === "PUBLIC",
      divisionNames: input.data.divisionNames.split(",").map((name) => name.trim()).filter(Boolean),
      confirmDivisionSync: input.data.confirmedDivisionIds !== undefined &&
        input.data.confirmedDivisionProjectCount !== undefined &&
        input.data.confirmedDivisionVoteCount !== undefined &&
        input.data.confirmedDivisionSwitchesVotingScope !== undefined
        ? {
            divisionIds: input.data.confirmedDivisionIds.split(",").filter(Boolean),
            divisionNames: [],
            projectCount: input.data.confirmedDivisionProjectCount,
            voteCount: input.data.confirmedDivisionVoteCount,
            switchesVotingScope: input.data.confirmedDivisionSwitchesVotingScope,
          }
        : undefined,
    });
  } catch (error) {
    if (error instanceof ProgramDivisionSyncConfirmationRequiredError) {
      return { status: "confirm", message: error.message, divisionSyncImpact: error.impact };
    }
    if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message };
    throw error;
  }
  refreshManagement(programId.data);
  return { status: "success", message: "기본 정보를 저장했습니다." };
}

export async function updateProgramOperationAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const programId = programIdSchema.safeParse(formData.get("programId"));
  const input = programOperationSchema.safeParse(Object.fromEntries(formData));
  if (!programId.success || !input.success) return { status: "error", message: "운영 설정과 팀 인원을 다시 확인해 주세요." };
  try {
    const currentActor = await actor();
    if (input.data.operationIntent === "ADVISOR_ONLY") {
      await service().updateAdvisorEnabled(currentActor, programId.data, input.data.advisorEnabled);
    } else {
      await service().updateOperation(currentActor, programId.data, {
        advisorEnabled: input.data.advisorEnabled,
        enabled: input.data.enabled,
        minSize: input.data.projectTeamMinSize,
        maxSize: input.data.projectTeamMaxSize,
      });
    }
  } catch (error) {
    if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message };
    throw error;
  }
  refreshManagement(programId.data, "operation");
  return input.data.operationIntent === "ADVISOR_ONLY"
    ? { status: "success", message: "지도교수 설정을 저장했습니다.", savedAdvisorEnabled: input.data.advisorEnabled }
    : { status: "success", message: "운영 설정을 저장했습니다." };
}

export async function updateProgramScheduleAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const programId = programIdSchema.safeParse(formData.get("programId"));
  const input = programScheduleSchema.safeParse(Object.fromEntries(formData));
  if (!programId.success || !input.success) return { status: "error", message: "운영·등록·수행 기간을 다시 확인해 주세요." };
  try {
    const currentActor = await actor();
    await service().updateSchedule(currentActor, programId.data, {
      startsAt: input.data.startsAt,
      endsAt: input.data.endsAt,
      projectRegistrationStartsAt: input.data.projectRegistrationStartsAt,
      projectRegistrationEndsAt: input.data.projectRegistrationEndsAt,
      recruitmentStartsAt: input.data.recruitmentStartsAt ?? null,
      recruitmentEndsAt: input.data.recruitmentEndsAt ?? null,
      executionStartsAt: input.data.executionStartsAt,
      executionEndsAt: input.data.executionEndsAt,
      transitionToDirect: input.data.targetMode === "DIRECT",
    });
  } catch (error) {
    if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message };
    throw error;
  }
  refreshManagement(programId.data, "schedule");
  return { status: "success", message: "일정을 저장했습니다." };
}

export async function updateProgramVotingPolicyAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const programId = programIdSchema.safeParse(formData.get("programId"));
  const input = programVotingSchema.safeParse(managementFormData(formData));
  if (!programId.success || !input.success) return { status: "error", message: "투표 기간과 정책을 다시 확인해 주세요." };
  try {
    await service().updateVotingPolicy(await actor(), programId.data, {
      votingPolicy: input.data.votingEnabled ? {
        startsAt: input.data.votingStartsAt!,
        endsAt: input.data.votingEndsAt!,
        voteLimit: input.data.voteLimit!,
        staffVoteLimit: input.data.staffVoteLimit,
        voteLimitScope: input.data.voteLimitScope!,
        selfVotingAllowed: input.data.selfVotingAllowed,
        resultsVisibleDuringVoting: input.data.resultsVisibleDuringVoting,
        resultsVisibleAfterVoting: input.data.resultsVisibleAfterVoting,
      } : null,
      confirmVoteReset: input.data.confirmedVoteCount && input.data.confirmedVoteFromLimit && input.data.confirmedVoteFromScope && input.data.confirmedVoteLimit && input.data.confirmedVoteLimitScope ? {
        voteCount: input.data.confirmedVoteCount,
        from: { voteLimit: input.data.confirmedVoteFromLimit, voteLimitScope: input.data.confirmedVoteFromScope },
        to: { voteLimit: input.data.confirmedVoteLimit, voteLimitScope: input.data.confirmedVoteLimitScope },
      } : undefined,
    });
  } catch (error) {
    if (error instanceof ProgramVoteResetConfirmationRequiredError) return { status: "confirm", message: error.message, voteResetImpact: error.impact };
    if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message };
    throw error;
  }
  refreshManagement(programId.data, "votes");
  return { status: "success", message: "투표 정책을 저장했습니다." };
}

function parseJsonArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function createProgramAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ name: z.string(), category: z.string(), description: z.string(), divisionNames: z.string(), startsAt: koreanLocalDateTime, endsAt: koreanLocalDateTime, icon: programIconSchema, visibility: programVisibilitySchema, advisorEnabled: z.enum(["true", "false"]).transform((value) => value === "true"), studentProjectCreationEnabled: z.enum(["true", "false"]).transform((value) => value === "true"), projectTeamMinSize: z.coerce.number().int(), projectTeamMaxSize: z.coerce.number().int() }).safeParse({
    ...Object.fromEntries(formData),
  });
  const settings = parseProgramSettings(formData, { useExecutionPeriodAsSubmissionPeriod: true });
  const definitions = programCreateDefinitionsSchema.safeParse({
    rubricDefinitions: parseJsonArray(formData.get("rubricDefinitions")),
    reportDefinitions: parseJsonArray(formData.get("reportDefinitions")),
  });
  if (!parsed.success || !settings.success || !definitions.success) return { status: "error", message: "프로그램 내용과 일정·채점표·보고서 설정을 확인해 주세요." };
  if (!parsed.data.studentProjectCreationEnabled && (!settings.data.recruitmentStartsAt || !settings.data.recruitmentEndsAt)) {
    return { status: "error", message: "등록 프로젝트 직접 지원 방식에서는 프로젝트 모집 기간을 입력해 주세요." };
  }
  let programId: string;
  try {
    const { visibility, ...program } = parsed.data;
    programId = await service().create(await actor(), {
      ...program,
      isPublic: visibility === "PUBLIC",
      projectRegistrationStartsAt: settings.data.projectRegistrationStartsAt,
      projectRegistrationEndsAt: settings.data.projectRegistrationEndsAt,
      recruitmentStartsAt: parsed.data.studentProjectCreationEnabled ? null : settings.data.recruitmentStartsAt!,
      recruitmentEndsAt: parsed.data.studentProjectCreationEnabled ? null : settings.data.recruitmentEndsAt!,
      executionStartsAt: settings.data.executionStartsAt,
      executionEndsAt: settings.data.executionEndsAt,
      submissionStartsAt: settings.data.submissionStartsAt,
      submissionEndsAt: settings.data.submissionEndsAt,
      rubricDefinitions: definitions.data.rubricDefinitions,
      reportDefinitions: definitions.data.reportDefinitions,
      divisionNames: parsed.data.divisionNames.split(",").map((name) => name.trim()).filter(Boolean),
      votingPolicy: settings.data.votingEnabled ? {
        startsAt: settings.data.votingStartsAt!,
        endsAt: settings.data.votingEndsAt!,
        voteLimit: settings.data.voteLimit!,
        staffVoteLimit: settings.data.staffVoteLimit,
        voteLimitScope: settings.data.voteLimitScope!,
        selfVotingAllowed: settings.data.selfVotingAllowed,
        resultsVisibleDuringVoting: settings.data.resultsVisibleDuringVoting,
        resultsVisibleAfterVoting: settings.data.resultsVisibleAfterVoting,
      } : null,
    });
  }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/topics");
  revalidatePath(programManagementHref(programId));
  redirect(programManagementHref(programId));
}

export async function changeProgramStatusAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({
    programId: z.string().min(1).max(200),
    operation: z.enum(["SET_PUBLIC", "CLOSE"]),
    visible: z.enum(["true", "false"]).optional(),
  }).superRefine((value, context) => {
    if (value.operation === "SET_PUBLIC" && value.visible === undefined) context.addIssue({ code: "custom", message: "공개 설정을 확인해 주세요." });
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "변경할 프로그램 상태를 다시 확인해 주세요." };
  try {
    const currentActor = await actor();
    if (parsed.data.operation === "CLOSE") await service().close(currentActor, parsed.data.programId);
    else await service().setVisibility(currentActor, parsed.data.programId, parsed.data.visible === "true");
  }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/topics");
  revalidatePath(programManagementHref(parsed.data.programId));
  return { status: "success", message: parsed.data.operation === "CLOSE" ? "프로그램 운영을 마감했습니다." : parsed.data.visible === "true" ? "공개했습니다." : "비공개로 전환했습니다." };
}
