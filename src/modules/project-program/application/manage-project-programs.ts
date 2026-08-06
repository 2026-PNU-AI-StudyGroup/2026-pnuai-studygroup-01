import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  assertProjectRegistrationPeriod,
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
  status: "DRAFT" | "OPEN" | "CLOSED"; openedAt: Date | null; topicCount: number; teamCount: number;
  votingPolicy?: ProgramVotingPolicyDetails | null;
};

export type ProjectProgramCreateInput = Omit<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt"> & Partial<Pick<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt">> & {
  votingPolicy?: ProgramVotingPolicyDetails | null;
};

export type ProjectProgramSettings = Pick<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt"> & {
  votingPolicy: ProgramVotingPolicyDetails | null;
};

export type UpdateProjectProgramSettingsOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "VOTING_POLICY_HAS_VOTES"
  | "VOTE_LIMIT_CONFLICT"
  | "SELF_VOTE_CONFLICT"
  | "VOTE_PERIOD_CONFLICT"
  | "IDENTITY_VISIBILITY_LOCKED";

export interface ProjectProgramRepository {
  create(input: ProjectProgramDetails & { votingPolicy: ProgramVotingPolicyDetails | null; createdById: string }): Promise<"CREATED" | "DUPLICATE">;
  listAll(): Promise<ProjectProgramRecord[]>;
  listOpen(): Promise<ProjectProgramRecord[]>;
  findById(id: string): Promise<ProjectProgramRecord | null>;
  updateSettings(id: string, input: ProjectProgramSettings): Promise<UpdateProjectProgramSettingsOutcome>;
  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean>;
  changeStudentProjectCreation(id: string, enabled: boolean): Promise<boolean>;
  changeIcon(id: string, icon: ProgramIconKey): Promise<boolean>;
  findOpen(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt?: Date;
    projectRegistrationEndsAt?: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
  } | null>;
}

export class ProjectProgramOperationError extends Error {}

export class ProjectProgramService {
  constructor(private readonly repository: ProjectProgramRepository) {}
  listOpen() { return this.repository.listOpen(); }
  async listRegistrableOpen(now = new Date()) {
    return (await this.listOpen()).filter((program) => isProjectRegistrationOpen(program, now));
  }
  async listStudentCreatableOpen(now = new Date()) {
    return (await this.listRegistrableOpen(now)).filter(({ studentProjectCreationEnabled }) => studentProjectCreationEnabled);
  }
  async listAll(actor: CurrentActor) { assertProgramAdmin(actor); return this.repository.listAll(); }
  async create(actor: CurrentActor, input: ProjectProgramCreateInput) {
    assertProgramAdmin(actor);
    const { votingPolicy, ...details } = input;
    const outcome = await this.repository.create({
      ...normalizeProjectProgram({
        ...details,
        projectRegistrationStartsAt: input.projectRegistrationStartsAt ?? input.startsAt,
        projectRegistrationEndsAt: input.projectRegistrationEndsAt ?? input.endsAt,
      }),
      votingPolicy: votingPolicy ? normalizeProgramVotingPolicy(votingPolicy) : null,
      createdById: actor.id,
    });
    if (outcome !== "CREATED") throw new ProjectProgramOperationError("같은 시작 시각에 동일한 프로그램명이 있습니다.");
  }
  async changeStatus(actor: CurrentActor, id: string, status: "OPEN" | "CLOSED", now = new Date()) {
    assertProgramAdmin(actor);
    if (!(await this.repository.changeStatus(id, status, actor.id, now))) throw new ProjectProgramOperationError("변경할 수 없는 프로그램 상태입니다.");
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
    const settings: ProjectProgramSettings = {
      projectRegistrationStartsAt: input.projectRegistrationStartsAt,
      projectRegistrationEndsAt: input.projectRegistrationEndsAt,
      votingPolicy: input.votingPolicy ? normalizeProgramVotingPolicy(input.votingPolicy) : null,
    };
    // 등록기간은 운영기간 및 기존 등록 이력과 독립적으로 수정한다.
    assertProjectRegistrationPeriod(settings.projectRegistrationStartsAt, settings.projectRegistrationEndsAt);
    const outcome = await this.repository.updateSettings(id, settings);
    if (outcome === "UPDATED") return;
    const messages: Record<Exclude<UpdateProjectProgramSettingsOutcome, "UPDATED">, string> = {
      NOT_FOUND: "설정할 프로그램이 없습니다.",
      VOTING_POLICY_HAS_VOTES: "표가 저장된 투표 설정은 해제할 수 없습니다. 종료 시각을 조정해 마감해 주세요.",
      VOTE_LIMIT_CONFLICT: "기존 투표자가 선택한 프로젝트 수보다 적게 줄일 수 없습니다.",
      SELF_VOTE_CONFLICT: "기존 자기 프로젝트 표가 있어 자기 프로젝트 투표를 금지할 수 없습니다.",
      VOTE_PERIOD_CONFLICT: "기존 투표 시각을 제외하는 기간으로 변경할 수 없습니다.",
      IDENTITY_VISIBILITY_LOCKED: "첫 표가 저장된 뒤에는 익명·기명 방식을 변경할 수 없습니다.",
    };
    throw new ProjectProgramOperationError(messages[outcome]);
  }
}
