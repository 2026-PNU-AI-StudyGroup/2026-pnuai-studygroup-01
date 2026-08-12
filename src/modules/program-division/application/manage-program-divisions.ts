import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type ProgramDivisionImpact = { projectCount: number; voteCount: number; switchesVotingScope: boolean };
export type ProgramDivision = { id: string; name: string; position: number; projectCount: number };

export interface ProgramDivisionRepository {
  list(programId: string): Promise<ProgramDivision[]>;
  create(programId: string, name: string, actorId: string): Promise<"CREATED" | "DUPLICATE" | "NOT_FOUND">;
  rename(id: string, name: string, actorId: string): Promise<"UPDATED" | "DUPLICATE" | "NOT_FOUND">;
  move(id: string, direction: "up" | "down", actorId: string): Promise<boolean>;
  impact(id: string): Promise<ProgramDivisionImpact | null>;
  delete(id: string, actorId: string, confirmed: boolean, confirmedImpact?: ProgramDivisionImpact): Promise<"DELETED" | "CONFIRMATION_REQUIRED" | "SCORED_RUBRIC" | "PROGRAM_CLOSED" | "NOT_FOUND">;
}

export class ProgramDivisionService {
  constructor(private readonly repository: ProgramDivisionRepository) {}
  private admin(actor: CurrentActor) { if (actor.role !== "ADMIN") throw new Error("관리자만 분과를 관리할 수 있습니다."); }
  list(actor: CurrentActor, programId: string) { this.admin(actor); return this.repository.list(programId); }
  create(actor: CurrentActor, programId: string, name: string) { this.admin(actor); return this.repository.create(programId, normalizeName(name), actor.id); }
  rename(actor: CurrentActor, id: string, name: string) { this.admin(actor); return this.repository.rename(id, normalizeName(name), actor.id); }
  move(actor: CurrentActor, id: string, direction: "up" | "down") { this.admin(actor); return this.repository.move(id, direction, actor.id); }
  impact(actor: CurrentActor, id: string) { this.admin(actor); return this.repository.impact(id); }
  delete(actor: CurrentActor, id: string, confirmed: boolean, confirmedImpact?: ProgramDivisionImpact) { this.admin(actor); return this.repository.delete(id, actor.id, confirmed, confirmedImpact); }
}

function normalizeName(name: string) {
  const value = name.trim();
  if (!value || value.length > 40) throw new Error("분과 이름은 1자 이상 40자 이내로 입력해 주세요.");
  return value;
}
