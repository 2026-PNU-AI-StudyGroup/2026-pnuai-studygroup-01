import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  assertValidProjectTeamSizePolicy,
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
  isPublic?: boolean; topicCount: number; teamCount: number;
  firstPublishedAt?: Date | null; endProcessedAt?: Date | null;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  divisions?: Array<{ id: string; name: string; position: number }>;
  votingPolicy?: ProgramVotingPolicyDetails | null;
};

export type ProjectProgramCreateInput = Omit<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt"> & Partial<Pick<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt">> & {
  isPublic?: boolean;
  divisionNames?: string[];
  votingPolicy?: ProgramVotingPolicyDetails | null;
  rubricDefinitions?: ProgramCreateRubricDefinitionInput[];
  reportDefinitions?: ProgramCreateReportDefinitionInput[];
};

export type ProgramCreateRubricDefinitionInput = {
  divisionName: string | null;
  title: string;
  gradingDueAt: Date;
  audience: "STAFF_ONLY" | "TEAM_MEMBERS";
  criteria: Array<{ label: string; maxPoints: number }>;
};

export type ProgramCreateReportDefinitionInput = { title: string; dueAt: Date; required?: boolean };

export type ProjectProgramCreateSetup = {
  isPublic?: boolean;
  divisionNames?: string[];
  votingPolicy: ProgramVotingPolicyDetails | null;
  rubricDefinitions?: ProgramCreateRubricDefinitionInput[];
  reportDefinitions?: ProgramCreateReportDefinitionInput[];
};

export type ProjectProgramSettings = Partial<Pick<ProjectProgramDetails,
  "projectRegistrationStartsAt" | "projectRegistrationEndsAt" |
  "recruitmentStartsAt" | "recruitmentEndsAt" |
  "executionStartsAt" | "executionEndsAt" |
  "name" | "category" | "startsAt" | "endsAt" | "advisorEnabled"
>> & Pick<ProjectProgramRecord, "isPublic"> & {
  votingPolicy?: ProgramVotingPolicyDetails | null;
  confirmVoteReset?: ProgramVoteResetImpact;
};

export type ProgramDivisionSyncImpact = {
  divisionIds: string[];
  divisionNames: string[];
  projectCount: number;
  voteCount: number;
  switchesVotingScope: boolean;
};

export type ProjectProgramBasicInfoUpdate = Pick<ProjectProgramDetails, "name" | "category"> & {
  isPublic: boolean;
  divisionNames: string[];
  confirmDivisionSync?: ProgramDivisionSyncImpact;
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
  | { status: "VOTE_RESET_CONFIRMATION_REQUIRED"; impact: ProgramVoteResetImpact }
  | "DIVISIONS_REQUIRED";

export type UpdateProjectProgramBasicInfoOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "SCORED_RUBRIC"
  | { status: "DIVISION_SYNC_CONFIRMATION_REQUIRED"; impact: ProgramDivisionSyncImpact };

export type ChangeStudentProjectPolicyOutcome = "UPDATED" | "NOT_FOUND" | "TOPICS_EXIST";
export type UpdateProjectProgramScheduleOutcome = "UPDATED" | "NOT_FOUND" | "TOPICS_EXIST";
export type ProjectProgramScheduleUpdate = Pick<ProjectProgramDetails,
  "startsAt" | "endsAt" | "projectRegistrationStartsAt" | "projectRegistrationEndsAt" |
  "recruitmentStartsAt" | "recruitmentEndsAt" | "executionStartsAt" | "executionEndsAt"
> & {
  transitionToDirect?: boolean;
};

export interface ProjectProgramRepository {
  create(input: ProjectProgramDetails & ProjectProgramCreateSetup & { createdById: string }): Promise<string | "DUPLICATE">;
  listAll(): Promise<ProjectProgramRecord[]>;
  listPublic?(): Promise<ProjectProgramRecord[]>;
  listOpen(): Promise<ProjectProgramRecord[]>;
  listSidebarVisible(now: Date): Promise<ProjectProgramRecord[]>;
  findById(id: string): Promise<ProjectProgramRecord | null>;
  updateBasicInfo(id: string, input: ProjectProgramBasicInfoUpdate, actorId: string): Promise<UpdateProjectProgramBasicInfoOutcome>;
  updateSettings(id: string, input: ProjectProgramSettings, actorId: string): Promise<UpdateProjectProgramSettingsOutcome>;
  updateSchedule(id: string, input: ProjectProgramScheduleUpdate): Promise<UpdateProjectProgramScheduleOutcome>;
  setVisibility?(id: string, visible: boolean, changedAt: Date): Promise<boolean>;
  close?(id: string, changedById: string, changedAt: Date): Promise<boolean>;
  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean>;
  changeStudentProjectPolicy(id: string, input: { enabled: boolean; minSize: number; maxSize: number; recruitmentStartsAt: Date | null; recruitmentEndsAt: Date | null; advisorEnabled?: boolean }): Promise<ChangeStudentProjectPolicyOutcome>;
  changeIcon(id: string, icon: ProgramIconKey): Promise<boolean>;
  findPublicActive?(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt?: Date;
    projectRegistrationEndsAt?: Date;
    recruitmentStartsAt: Date | null;
    recruitmentEndsAt: Date | null;
    executionStartsAt: Date;
    executionEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
    projectTeamMinSize: number;
    projectTeamMaxSize: number;
  } | null>;
  findOpen(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt?: Date;
    projectRegistrationEndsAt?: Date;
    recruitmentStartsAt: Date | null;
    recruitmentEndsAt: Date | null;
    executionStartsAt: Date;
    executionEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
    projectTeamMinSize: number;
    projectTeamMaxSize: number;
  } | null>;
}

export class ProjectProgramOperationError extends Error {}
export class ProgramVoteResetConfirmationRequiredError extends ProjectProgramOperationError {
  constructor(readonly impact: ProgramVoteResetImpact) {
    super("투표 범위 또는 한도를 바꾸려면 기존 표 초기화를 확인해 주세요.");
  }
}
export class ProgramDivisionSyncConfirmationRequiredError extends ProjectProgramOperationError {
  constructor(readonly impact: ProgramDivisionSyncImpact) {
    super("분과를 삭제하면 연결 프로젝트가 미분과로 이동하고 기존 투표가 초기화됩니다. 계속하려면 확인해 주세요.");
  }
}

export class ProjectProgramService {
  constructor(private readonly repository: ProjectProgramRepository) {}
  listPublic() { return this.repository.listPublic?.() ?? this.repository.listOpen(); }
  /** @deprecated Use listPublic; public visibility is now independent of closure. */
  listOpen() { return this.listPublic(); }
  listSidebarVisible(now = new Date()) { return this.repository.listSidebarVisible(now); }
  async listRegistrableOpen(now = new Date()) {
    return (await this.listPublic()).filter((program) => programLifecycleStatus(program, now) === "ACTIVE" && isProjectRegistrationOpen(program, now));
  }
  async listStudentCreatableOpen(now = new Date()) {
    return (await this.listRegistrableOpen(now)).filter(({ studentProjectCreationEnabled }) => studentProjectCreationEnabled);
  }
  async listAll(actor: CurrentActor) { assertProgramAdmin(actor); return this.repository.listAll(); }
  async create(actor: CurrentActor, input: ProjectProgramCreateInput) {
    assertProgramAdmin(actor);
    const {
      votingPolicy,
      divisionNames = [],
      rubricDefinitions = [],
      reportDefinitions = [],
      isPublic = false,
      ...details
    } = input;
    const normalizedDivisionNames = normalizeDivisionNames(divisionNames);
    const normalizedVotingPolicy = votingPolicy ? normalizeProgramVotingPolicy(votingPolicy) : null;
    const normalizedRubricDefinitions = normalizeCreateRubrics(rubricDefinitions, normalizedDivisionNames, details.startsAt, details.endsAt);
    const normalizedReportDefinitions = normalizeCreateReports(reportDefinitions, details.executionStartsAt, details.executionEndsAt);
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
      isPublic,
      divisionNames: normalizedDivisionNames,
      rubricDefinitions: normalizedRubricDefinitions,
      reportDefinitions: normalizedReportDefinitions,
      createdById: actor.id,
    });
    if (outcome === "DUPLICATE") throw new ProjectProgramOperationError("같은 시작 시각에 동일한 프로그램명이 있습니다.");
    return outcome;
  }
  async setVisibility(actor: CurrentActor, id: string, visible: boolean, now = new Date()) {
    assertProgramAdmin(actor);
    const changed = this.repository.setVisibility
      ? await this.repository.setVisibility(id, visible, now)
      : visible ? await this.repository.changeStatus(id, "OPEN", actor.id, now) : false;
    if (!changed) throw new ProjectProgramOperationError("공개 설정을 변경할 프로그램이 없습니다.");
  }
  async setPublic(actor: CurrentActor, id: string, visible: boolean, now = new Date()) {
    return this.setVisibility(actor, id, visible, now);
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
  async changeStudentProjectPolicy(actor: CurrentActor, id: string, input: { enabled: boolean; minSize: number; maxSize: number; recruitmentStartsAt?: Date | null; recruitmentEndsAt?: Date | null; advisorEnabled?: boolean }) {
    assertProgramAdmin(actor);
    const program = await this.repository.findById(id);
    if (!program) throw new ProjectProgramOperationError("프로젝트 참여 방식을 변경할 프로그램이 없습니다.");
    const normalized = { ...input, minSize: input.enabled ? input.minSize : 1 };
    assertValidProjectTeamSizePolicy(normalized.minSize, normalized.maxSize);
    const recruitmentStartsAt = normalized.enabled
      ? null
      : program.studentProjectCreationEnabled
        ? normalized.recruitmentStartsAt ?? null
        : program.recruitmentStartsAt;
    const recruitmentEndsAt = normalized.enabled
      ? null
      : program.studentProjectCreationEnabled
        ? normalized.recruitmentEndsAt ?? null
        : program.recruitmentEndsAt;
    const validProgram = normalizeProjectProgram({
      ...program,
      projectRegistrationStartsAt: program.projectRegistrationStartsAt ?? program.startsAt,
      projectRegistrationEndsAt: program.projectRegistrationEndsAt ?? program.endsAt,
      studentProjectCreationEnabled: normalized.enabled,
      projectTeamMinSize: normalized.minSize,
      projectTeamMaxSize: normalized.maxSize,
      recruitmentStartsAt,
      recruitmentEndsAt,
    });
    const outcome = await this.repository.changeStudentProjectPolicy(id, {
      enabled: normalized.enabled,
      minSize: validProgram.projectTeamMinSize!,
      maxSize: validProgram.projectTeamMaxSize!,
      recruitmentStartsAt: validProgram.recruitmentStartsAt,
      recruitmentEndsAt: validProgram.recruitmentEndsAt,
      advisorEnabled: input.advisorEnabled,
    });
    if (outcome === "UPDATED") return;
    if (outcome === "TOPICS_EXIST") throw new ProjectProgramOperationError("프로젝트가 하나 이상 등록된 프로그램은 참여 방식을 변경할 수 없습니다.");
    throw new ProjectProgramOperationError("프로젝트 참여 방식을 변경할 프로그램이 없습니다.");
  }
  async updateBasicInfo(actor: CurrentActor, id: string, input: ProjectProgramBasicInfoUpdate) {
    assertProgramAdmin(actor);
    const program = await this.repository.findById(id);
    if (!program) throw new ProjectProgramOperationError("설정할 프로그램이 없습니다.");
    const normalized = normalizeProjectProgram({
      ...program,
      ...input,
      projectRegistrationStartsAt: program.projectRegistrationStartsAt ?? program.startsAt,
      projectRegistrationEndsAt: program.projectRegistrationEndsAt ?? program.endsAt,
    });
    const outcome = await this.repository.updateBasicInfo(id, {
      name: normalized.name,
      category: normalized.category,
      isPublic: input.isPublic,
      divisionNames: normalizeDivisionNames(input.divisionNames),
      confirmDivisionSync: input.confirmDivisionSync,
    }, actor.id);
    if (outcome === "UPDATED") return;
    if (typeof outcome === "object") throw new ProgramDivisionSyncConfirmationRequiredError(outcome.impact);
    if (outcome === "SCORED_RUBRIC") throw new ProjectProgramOperationError("이 분과 팀에 저장된 평가 점수가 있어 분과를 삭제할 수 없습니다.");
    throw new ProjectProgramOperationError("설정할 프로그램이 없습니다.");
  }
  async updateOperation(actor: CurrentActor, id: string, input: { advisorEnabled: boolean; enabled: boolean; minSize: number; maxSize: number; recruitmentStartsAt?: Date | null; recruitmentEndsAt?: Date | null }) {
    return this.changeStudentProjectPolicy(actor, id, input);
  }
  async updateAdvisorEnabled(actor: CurrentActor, id: string, advisorEnabled: boolean) {
    assertProgramAdmin(actor);
    const outcome = await this.repository.updateSettings(id, { advisorEnabled }, actor.id);
    if (outcome !== "UPDATED") throw new ProjectProgramOperationError("지도교수 설정을 변경할 프로그램이 없습니다.");
  }
  async updateSchedule(actor: CurrentActor, id: string, input: ProjectProgramScheduleUpdate) {
    assertProgramAdmin(actor);
    const outcome = await this.repository.updateSchedule(id, input);
    if (outcome === "UPDATED") return;
    if (outcome === "TOPICS_EXIST") throw new ProjectProgramOperationError("프로젝트가 하나 이상 등록된 프로그램은 참여 방식을 변경할 수 없습니다.");
    throw new ProjectProgramOperationError("일정을 변경할 프로그램이 없습니다.");
  }
  async updateVotingPolicy(actor: CurrentActor, id: string, input: { votingPolicy: ProgramVotingPolicyDetails | null; confirmVoteReset?: ProgramVoteResetImpact }) {
    assertProgramAdmin(actor);
    const outcome = await this.repository.updateSettings(id, {
      votingPolicy: input.votingPolicy ? normalizeProgramVotingPolicy(input.votingPolicy) : null,
      confirmVoteReset: input.confirmVoteReset,
    }, actor.id);
    if (outcome === "UPDATED") return;
    if (typeof outcome === "object") throw new ProgramVoteResetConfirmationRequiredError(outcome.impact);
    const messages: Record<Exclude<Extract<UpdateProjectProgramSettingsOutcome, string>, "UPDATED" | "NOT_FOUND">, string> = {
      VOTING_POLICY_HAS_VOTES: "표가 저장된 투표 설정은 해제할 수 없습니다. 종료 시각을 조정해 마감해 주세요.",
      VOTE_LIMIT_CONFLICT: "기존 투표자가 선택한 프로젝트 수보다 적게 줄일 수 없습니다.",
      SELF_VOTE_CONFLICT: "기존 자기 프로젝트 표가 있어 자기 프로젝트 투표를 금지할 수 없습니다.",
      DIVISIONS_REQUIRED: "분과별 투표는 분과를 하나 이상 등록한 프로그램에서만 사용할 수 있습니다.",
    };
    throw new ProjectProgramOperationError(outcome === "NOT_FOUND" ? "투표 정책을 변경할 프로그램이 없습니다." : messages[outcome]);
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
      startsAt: input.startsAt ?? program.startsAt,
      endsAt: input.endsAt ?? program.endsAt,
      advisorEnabled: input.advisorEnabled ?? program.advisorEnabled,
      projectRegistrationStartsAt: input.projectRegistrationStartsAt ?? program.projectRegistrationStartsAt ?? program.startsAt,
      projectRegistrationEndsAt: input.projectRegistrationEndsAt ?? program.projectRegistrationEndsAt ?? program.endsAt,
      recruitmentStartsAt: input.recruitmentStartsAt ?? program.recruitmentStartsAt,
      recruitmentEndsAt: input.recruitmentEndsAt ?? program.recruitmentEndsAt,
      executionStartsAt: input.executionStartsAt ?? program.executionStartsAt,
      executionEndsAt: input.executionEndsAt ?? program.executionEndsAt,
      votingPolicy: input.votingPolicy === undefined ? program.votingPolicy ?? null : input.votingPolicy ? normalizeProgramVotingPolicy(input.votingPolicy) : null,
      confirmVoteReset: input.confirmVoteReset,
    };
    const normalized = normalizeProjectProgram({
      name: settings.name!,
      category: settings.category!,
      startsAt: settings.startsAt!,
      endsAt: settings.endsAt!,
      projectRegistrationStartsAt: settings.projectRegistrationStartsAt!,
      projectRegistrationEndsAt: settings.projectRegistrationEndsAt!,
      recruitmentStartsAt: settings.recruitmentStartsAt ?? null,
      recruitmentEndsAt: settings.recruitmentEndsAt ?? null,
      executionStartsAt: settings.executionStartsAt!,
      executionEndsAt: settings.executionEndsAt!,
      advisorEnabled: settings.advisorEnabled!,
      studentProjectCreationEnabled: program.studentProjectCreationEnabled,
      projectTeamMinSize: program.projectTeamMinSize,
      projectTeamMaxSize: program.projectTeamMaxSize,
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
      DIVISIONS_REQUIRED: "분과별 투표는 분과를 하나 이상 등록한 프로그램에서만 사용할 수 있습니다.",
    };
    throw new ProjectProgramOperationError(messages[outcome]);
  }
}

export function programLifecycleStatus(program: Pick<ProjectProgramRecord, "endsAt">, now = new Date()): "ACTIVE" | "CLOSED" {
  return program.endsAt > now ? "ACTIVE" : "CLOSED";
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

function normalizeCreateRubrics(definitions: ProgramCreateRubricDefinitionInput[], divisionNames: string[], startsAt: Date, endsAt: Date) {
  if (definitions.length > 30) throw new ProjectProgramOperationError("채점표는 최대 30개까지 등록할 수 있습니다.");
  const divisions = new Set(divisionNames.map((name) => name.toLocaleLowerCase("ko-KR")));
  const scopeTitles = new Set<string>();
  return definitions.map((definition) => {
    const title = definition.title.trim();
    const divisionName = definition.divisionName?.trim() || null;
    if (!title || title.length > 100 || Number.isNaN(definition.gradingDueAt.getTime())) throw new ProjectProgramOperationError("채점표 제목과 마감을 확인해 주세요.");
    if (definition.gradingDueAt < startsAt || definition.gradingDueAt > endsAt) throw new ProjectProgramOperationError("채점 마감은 프로그램 운영 기간 안이어야 합니다.");
    if (divisionName && !divisions.has(divisionName.toLocaleLowerCase("ko-KR"))) throw new ProjectProgramOperationError("채점표에 연결된 분과를 확인해 주세요.");
    const duplicateKey = `${divisionName?.toLocaleLowerCase("ko-KR") ?? "common"}:${title.toLocaleLowerCase("ko-KR")}`;
    if (scopeTitles.has(duplicateKey)) throw new ProjectProgramOperationError("같은 범위에 동일한 제목의 채점표가 있습니다.");
    scopeTitles.add(duplicateKey);
    if (definition.criteria.length === 0) throw new ProjectProgramOperationError("채점표에는 평가 항목을 하나 이상 추가해 주세요.");
    if (definition.criteria.length > 50) throw new ProjectProgramOperationError("채점 항목은 채점표당 최대 50개까지 등록할 수 있습니다.");
    const criteria = definition.criteria.map((criterion) => {
      const label = criterion.label.trim();
      if (!label || label.length > 60 || !Number.isInteger(criterion.maxPoints) || criterion.maxPoints < 1 || criterion.maxPoints > 100) throw new ProjectProgramOperationError("채점 항목 이름과 배점을 확인해 주세요.");
      return { label, maxPoints: criterion.maxPoints };
    });
    return { ...definition, divisionName, title, criteria };
  });
}

function normalizeCreateReports(definitions: ProgramCreateReportDefinitionInput[], startsAt: Date, endsAt: Date) {
  if (definitions.length > 30) throw new ProjectProgramOperationError("보고서는 최대 30개까지 등록할 수 있습니다.");
  const titles = new Set<string>();
  return definitions.map((definition) => {
    const title = definition.title.trim();
    if (!title || title.length > 100 || Number.isNaN(definition.dueAt.getTime())) throw new ProjectProgramOperationError("보고서 제목과 제출 마감을 확인해 주세요.");
    if (definition.dueAt < startsAt || definition.dueAt > endsAt) throw new ProjectProgramOperationError("보고서 제출 마감은 수행 기간 안이어야 합니다.");
    const key = title.toLocaleLowerCase("ko-KR");
    if (titles.has(key)) throw new ProjectProgramOperationError("같은 이름의 보고서를 중복 등록할 수 없습니다.");
    titles.add(key);
    return { title, dueAt: definition.dueAt, required: definition.required ?? true };
  });
}
