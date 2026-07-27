import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { assertProgramAdmin, normalizeProjectProgram, type ProjectProgramDetails } from "@/modules/project-program/domain/project-program-policy";

export type ProjectProgramRecord = ProjectProgramDetails & {
  id: string; academicCycleId: string; academicYear: number; term: "FIRST" | "SECOND";
  status: "DRAFT" | "OPEN" | "CLOSED"; openedAt: Date | null; topicCount: number; teamCount: number;
};

export interface ProjectProgramRepository {
  create(input: ProjectProgramDetails & { academicCycleId: string; createdById: string }): Promise<"CREATED" | "CYCLE_NOT_FOUND" | "DUPLICATE">;
  listAll(): Promise<ProjectProgramRecord[]>;
  listOpen(): Promise<ProjectProgramRecord[]>;
  changeStatus(id: string, status: "OPEN" | "CLOSED", changedAt: Date): Promise<boolean>;
  changeStudentProjectCreation(id: string, enabled: boolean): Promise<boolean>;
  findOpen(id: string): Promise<{ id: string; academicCycleId: string; startsAt: Date; endsAt: Date; advisorEnabled: boolean; studentProjectCreationEnabled: boolean } | null>;
}

export class ProjectProgramOperationError extends Error {}

export class ProjectProgramService {
  constructor(private readonly repository: ProjectProgramRepository) {}
  listOpen() { return this.repository.listOpen(); }
  async listStudentCreatableOpen() {
    return (await this.repository.listOpen()).filter(({ studentProjectCreationEnabled }) => studentProjectCreationEnabled);
  }
  async listAll(actor: CurrentActor) { assertProgramAdmin(actor); return this.repository.listAll(); }
  async create(actor: CurrentActor, input: ProjectProgramDetails & { academicCycleId: string }) {
    assertProgramAdmin(actor);
    const outcome = await this.repository.create({ ...normalizeProjectProgram(input), academicCycleId: input.academicCycleId, createdById: actor.id });
    if (outcome !== "CREATED") throw new ProjectProgramOperationError(outcome === "DUPLICATE" ? "같은 학기에 동일한 프로그램명이 있습니다." : "존재하지 않는 학기입니다.");
  }
  async changeStatus(actor: CurrentActor, id: string, status: "OPEN" | "CLOSED", now = new Date()) {
    assertProgramAdmin(actor);
    if (!(await this.repository.changeStatus(id, status, now))) throw new ProjectProgramOperationError("변경할 수 없는 프로그램 상태입니다.");
  }
  async changeStudentProjectCreation(actor: CurrentActor, id: string, enabled: boolean) {
    assertProgramAdmin(actor);
    if (!(await this.repository.changeStudentProjectCreation(id, enabled))) {
      throw new ProjectProgramOperationError("학생 프로젝트 생성 설정을 변경할 프로그램이 없습니다.");
    }
  }
}
