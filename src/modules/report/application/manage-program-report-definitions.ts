import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type ProgramReportDefinitionInput = {
  title: string;
  dueAt: Date;
  required?: boolean;
};

export type ProgramReportDefinitionOutcome =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "INVALID_DEADLINE"
  | "HAS_SUBMISSION_HISTORY"
  | "SUBMISSION_CONFLICT";

export interface ProgramReportDefinitionWriter {
  create(input: ProgramReportDefinitionInput & { programId: string; actorId: string; now: Date }): Promise<ProgramReportDefinitionOutcome>;
  update(input: ProgramReportDefinitionInput & { programId: string; definitionId: string; actorId: string; now: Date }): Promise<ProgramReportDefinitionOutcome>;
  move(input: { programId: string; definitionId: string; direction: "up" | "down"; actorId: string }): Promise<ProgramReportDefinitionOutcome>;
  delete(input: { programId: string; definitionId: string; actorId: string; now: Date }): Promise<ProgramReportDefinitionOutcome>;
}

export class ProgramReportDefinitionService {
  constructor(private readonly writer: ProgramReportDefinitionWriter) {}

  create(actor: CurrentActor, programId: string, input: ProgramReportDefinitionInput, now = new Date()) {
    requireAdmin(actor);
    return this.writer.create({ programId, actorId: actor.id, ...normalize(input), now });
  }

  update(actor: CurrentActor, programId: string, definitionId: string, input: ProgramReportDefinitionInput, now = new Date()) {
    requireAdmin(actor);
    return this.writer.update({ programId, definitionId, actorId: actor.id, ...normalize(input), now });
  }

  move(actor: CurrentActor, programId: string, definitionId: string, direction: "up" | "down") {
    requireAdmin(actor);
    return this.writer.move({ programId, definitionId, direction, actorId: actor.id });
  }

  delete(actor: CurrentActor, programId: string, definitionId: string, now = new Date()) {
    requireAdmin(actor);
    return this.writer.delete({ programId, definitionId, actorId: actor.id, now });
  }
}

function requireAdmin(actor: CurrentActor) {
  if (actor.role !== "ADMIN") throw new Error("관리자만 보고서 정의를 관리할 수 있습니다.");
}

function normalize(input: ProgramReportDefinitionInput): Required<ProgramReportDefinitionInput> {
  const title = input.title.trim();
  if (!title || title.length > 100 || Number.isNaN(input.dueAt.getTime())) {
    throw new Error("보고서 제목과 제출 마감을 확인해 주세요.");
  }
  return { title, dueAt: input.dueAt, required: input.required ?? true };
}
