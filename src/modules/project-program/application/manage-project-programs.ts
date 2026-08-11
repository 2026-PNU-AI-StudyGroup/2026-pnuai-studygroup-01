import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  assertProgramAdmin,
  isProjectRegistrationOpen,
  normalizeProgramVotingPolicy,
  normalizeProjectProgram,
  type ProgramVotingPolicyDetails,
  type ProjectProgramDetails,
} from "@/modules/project-program/domain/project-program-policy";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";

export type ProjectProgramRecord = Omit<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt"> & Partial<Pick<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt">> & {
  id: string; startYear: number;
  isPublic?: boolean; lifecycleStatus?: "ACTIVE" | "CLOSED"; topicCount: number; teamCount: number;
  firstPublishedAt?: Date | null; closedAt?: Date | null;
  /** Compatibility projection for callers not yet migrated to the visibility/lifecycle fields. */
  status?: "DRAFT" | "OPEN" | "CLOSED";
  divisions?: Array<{ id: string; name: string; position: number }>;
  votingPolicy?: ProgramVotingPolicyDetails | null;
};

export type ProjectProgramCreateInput = Omit<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt"> & Partial<Pick<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt">> & {
  divisionNames?: string[];
  votingPolicy?: ProgramVotingPolicyDetails | null;
};

export type ProjectProgramSettings = Pick<ProjectProgramDetails,
  "projectRegistrationStartsAt" | "projectRegistrationEndsAt" |
  "recruitmentStartsAt" | "recruitmentEndsAt" |
  "executionStartsAt" | "executionEndsAt" |
  "submissionStartsAt" | "submissionEndsAt"
> & Partial<Pick<ProjectProgramDetails, "name" | "category" | "description" | "startsAt" | "endsAt" | "advisorEnabled">> & {
  votingPolicy: ProgramVotingPolicyDetails | null;
  confirmVoteReset?: ProgramVoteResetImpact;
};

export type ProgramVoteResetImpact = {
  voteCount: number;
  from: { voteLimit: number; voteLimitScope: "PROGRAM" | "DIVISION" };
  to: { voteLimit: number; voteLimitScope: "PROGRAM" | "DIVISION" };
};

export type UpdateProjectProgramSettingsOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "VOTING_POLICY_HAS_VOTES"
  | "VOTE_LIMIT_CONFLICT"
  | "SELF_VOTE_CONFLICT"
  | "VOTE_PERIOD_CONFLICT"
  | "IDENTITY_VISIBILITY_LOCKED"
  | "DEPENDENT_SCHEDULE_CONFLICT"
  | { status: "VOTE_RESET_CONFIRMATION_REQUIRED"; impact: ProgramVoteResetImpact }
  | "DIVISIONS_REQUIRED";

export interface ProjectProgramRepository {
  create(input: ProjectProgramDetails & { divisionNames?: string[]; votingPolicy: ProgramVotingPolicyDetails | null; createdById: string }): Promise<string | "DUPLICATE">;
  listAll(): Promise<ProjectProgramRecord[]>;
  listPublic?(): Promise<ProjectProgramRecord[]>;
  listOpen(): Promise<ProjectProgramRecord[]>;
  listSidebarVisible(now: Date): Promise<ProjectProgramRecord[]>;
  findById(id: string): Promise<ProjectProgramRecord | null>;
  updateSettings(id: string, input: ProjectProgramSettings, actorId: string): Promise<UpdateProjectProgramSettingsOutcome>;
  setPublic?(id: string, isPublic: boolean, changedAt: Date): Promise<boolean>;
  close?(id: string, changedById: string, changedAt: Date): Promise<boolean>;
  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean>;
  changeStudentProjectCreation(id: string, enabled: boolean): Promise<boolean>;
  changeIcon(id: string, icon: ProgramIconKey): Promise<boolean>;
  findPublicActive?(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt?: Date;
    projectRegistrationEndsAt?: Date;
    recruitmentStartsAt: Date;
    recruitmentEndsAt: Date;
    executionStartsAt: Date;
    executionEndsAt: Date;
    submissionStartsAt: Date;
    submissionEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
  } | null>;
  findOpen(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt?: Date;
    projectRegistrationEndsAt?: Date;
    recruitmentStartsAt: Date;
    recruitmentEndsAt: Date;
    executionStartsAt: Date;
    executionEndsAt: Date;
    submissionStartsAt: Date;
    submissionEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
  } | null>;
}

export class ProjectProgramOperationError extends Error {}
export class ProgramVoteResetConfirmationRequiredError extends ProjectProgramOperationError {
  constructor(readonly impact: ProgramVoteResetImpact) {
    super("투표 범위 또는 한도를 바꾸려면 기존 표 초기화를 확인해 주세요.");
  }
}

export class ProjectProgramService {
  constructor(private readonly repository: ProjectProgramRepository) {}
  listPublic() { return this.repository.listPublic?.() ?? this.repository.listOpen(); }
  /** @deprecated Use listPublic; public visibility is now independent of closure. */
  listOpen() { return this.listPublic(); }
  listSidebarVisible(now = new Date()) { return this.repository.listSidebarVisible(now); }
  async listRegistrableOpen(now = new Date()) {
    return (await this.listPublic()).filter((program) => programLifecycleStatus(program) === "ACTIVE" && isProjectRegistrationOpen(program, now));
  }
  async listStudentCreatableOpen(now = new Date()) {
    return (await this.listRegistrableOpen(now)).filter(({ studentProjectCreationEnabled }) => studentProjectCreationEnabled);
  }
  async listAll(actor: CurrentActor) { assertProgramAdmin(actor); return this.repository.listAll(); }
  async create(actor: CurrentActor, input: ProjectProgramCreateInput) {
    assertProgramAdmin(actor);
    const { votingPolicy, divisionNames = [], ...details } = input;
    const normalizedDivisionNames = normalizeDivisionNames(divisionNames);
    const normalizedVotingPolicy = votingPolicy ? normalizeProgramVotingPolicy(votingPolicy) : null;
    if (normalizedVotingPolicy?.voteLimitScope === "DIVISION" && normalizedDivisionNames.length === 0) {
      throw new ProjectProgramOperationError("분과별 투표는 분과를 하나 이상 등록한 프로그램에서만 사용할 수 있습니다.");
    }
    const outcome = await this.repository.create({
      ...normalizeProjectProgram({
        ...details,
        projectRegistrationStartsAt: input.projectRegistrationStartsAt ?? input.startsAt,
        projectRegistrationEndsAt: input.projectRegistrationEndsAt ?? input.endsAt,
      }),
      votingPolicy: normalizedVotingPolicy,
      divisionNames: normalizedDivisionNames,
      createdById: actor.id,
    });
    if (outcome === "DUPLICATE") throw new ProjectProgramOperationError("같은 시작 시각에 동일한 프로그램명이 있습니다.");
    return outcome;
  }
  async setPublic(actor: CurrentActor, id: string, isPublic: boolean, now = new Date()) {
    assertProgramAdmin(actor);
    const changed = this.repository.setPublic
      ? await this.repository.setPublic(id, isPublic, now)
      : isPublic ? await this.repository.changeStatus(id, "OPEN", actor.id, now) : false;
    if (!changed) throw new ProjectProgramOperationError("공개 설정을 변경할 프로그램이 없습니다.");
  }
  async close(actor: CurrentActor, id: string, now = new Date()) {
    assertProgramAdmin(actor);
    const closed = this.repository.close
      ? await this.repository.close(id, actor.id, now)
      : await this.repository.changeStatus(id, "CLOSED", actor.id, now);
    if (!closed) throw new ProjectProgramOperationError("마감할 수 없는 프로그램입니다.");
  }
  /** @deprecated Use setPublic or close so intent cannot be conflated. */
  async changeStatus(actor: CurrentActor, id: string, status: "OPEN" | "CLOSED", now = new Date()) {
    if (status === "OPEN") return this.setPublic(actor, id, true, now);
    return this.close(actor, id, now);
  }
  async changeStudentProjectCreation(actor: CurrentActor, id: string, enabled: boolean) {
    assertProgramAdmin(actor);
    if (!(await this.repository.changeStudentProjectCreation(id, enabled))) {
      throw new ProjectProgramOperationError("학생 프로젝트 제안 설정을 변경할 프로그램이 없습니다.");
    }
  }
  async changeIcon(actor: CurrentActor, id: string, icon: ProgramIconKey) {
    assertProgramAdmin(actor);
    if (!(await this.repository.changeIcon(id, icon))) {
      throw new ProjectProgramOperationError("아이콘을 변경할 프로그램이 없습니다.");
    }
  }
  async getSettings(actor: CurrentActor, id: string) {
    assertProgramAdmin(actor);
    const program = await this.repository.findById(id);
    if (!program) throw new ProjectProgramOperationError("설정할 프로그램이 없습니다.");
    return program;
  }
  async updateSettings(actor: CurrentActor, id: string, input: ProjectProgramSettings) {
    assertProgramAdmin(actor);
    const program = await this.repository.findById(id);
    if (!program) throw new ProjectProgramOperationError("설정할 프로그램이 없습니다.");
    const settings: ProjectProgramSettings = {
      name: input.name ?? program.name,
      category: input.category ?? program.category,
      description: input.description ?? program.description,
      startsAt: input.startsAt ?? program.startsAt,
      endsAt: input.endsAt ?? program.endsAt,
      advisorEnabled: input.advisorEnabled ?? program.advisorEnabled,
      projectRegistrationStartsAt: input.projectRegistrationStartsAt,
      projectRegistrationEndsAt: input.projectRegistrationEndsAt,
      recruitmentStartsAt: input.recruitmentStartsAt,
      recruitmentEndsAt: input.recruitmentEndsAt,
      executionStartsAt: input.executionStartsAt,
      executionEndsAt: input.executionEndsAt,
      submissionStartsAt: input.submissionStartsAt,
      submissionEndsAt: input.submissionEndsAt,
      votingPolicy: input.votingPolicy ? normalizeProgramVotingPolicy(input.votingPolicy) : null,
      confirmVoteReset: input.confirmVoteReset,
    };
    const normalized = normalizeProjectProgram({
      name: settings.name!,
      category: settings.category!,
      description: settings.description!,
      startsAt: settings.startsAt!,
      endsAt: settings.endsAt!,
      projectRegistrationStartsAt: settings.projectRegistrationStartsAt,
      projectRegistrationEndsAt: settings.projectRegistrationEndsAt,
      recruitmentStartsAt: settings.recruitmentStartsAt,
      recruitmentEndsAt: settings.recruitmentEndsAt,
      executionStartsAt: settings.executionStartsAt,
      executionEndsAt: settings.executionEndsAt,
      submissionStartsAt: settings.submissionStartsAt,
      submissionEndsAt: settings.submissionEndsAt,
      advisorEnabled: settings.advisorEnabled!,
      studentProjectCreationEnabled: program.studentProjectCreationEnabled,
      icon: program.icon,
    });
    const outcome = await this.repository.updateSettings(id, { ...settings, ...normalized }, actor.id);
    if (outcome === "UPDATED") return;
    if (typeof outcome === "object") throw new ProgramVoteResetConfirmationRequiredError(outcome.impact);
    const messages: Record<Exclude<Extract<UpdateProjectProgramSettingsOutcome, string>, "UPDATED">, string> = {
      NOT_FOUND: "설정할 프로그램이 없습니다.",
      VOTING_POLICY_HAS_VOTES: "표가 저장된 투표 설정은 해제할 수 없습니다. 종료 시각을 조정해 마감해 주세요.",
      VOTE_LIMIT_CONFLICT: "기존 투표자가 선택한 프로젝트 수보다 적게 줄일 수 없습니다.",
      SELF_VOTE_CONFLICT: "기존 자기 프로젝트 표가 있어 자기 프로젝트 투표를 금지할 수 없습니다.",
      VOTE_PERIOD_CONFLICT: "기존 투표 시각을 제외하는 기간으로 변경할 수 없습니다.",
      IDENTITY_VISIBILITY_LOCKED: "첫 표가 저장된 뒤에는 익명·기명 방식을 변경할 수 없습니다.",
      DIVISIONS_REQUIRED: "분과별 투표는 분과를 하나 이상 등록한 프로그램에서만 사용할 수 있습니다.",
      DEPENDENT_SCHEDULE_CONFLICT: "기존 보고서 기한 또는 확정 지도 일정이 새 프로그램 일정 범위를 벗어납니다.",
    };
    throw new ProjectProgramOperationError(messages[outcome]);
  }
}

export function programLifecycleStatus(program: Pick<ProjectProgramRecord, "lifecycleStatus" | "status">): "ACTIVE" | "CLOSED" {
  return program.lifecycleStatus ?? (program.status === "CLOSED" ? "CLOSED" : "ACTIVE");
}

function normalizeDivisionNames(names: readonly string[]) {
  const normalized = names.map((name) => name.trim()).filter(Boolean);
  if (normalized.length > 20 || normalized.some((name) => name.length > 40)) {
    throw new ProjectProgramOperationError("분과는 최대 20개이며 이름은 40자 이하여야 합니다.");
  }
  if (new Set(normalized.map((name) => name.toLocaleLowerCase("ko-KR"))).size !== normalized.length) {
    throw new ProjectProgramOperationError("같은 이름의 분과를 중복 등록할 수 없습니다.");
  }
  return normalized;
}
