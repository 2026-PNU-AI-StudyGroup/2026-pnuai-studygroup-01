import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ReportRepository } from "@/modules/report/application/report-ports";
import {
  type ApprovalDecision,
  type ArtifactType,
  InvalidReportInputError,
  normalizeArtifact,
  normalizeDecisionComment,
  normalizeDescription,
  type ReportType,
} from "@/modules/report/domain/report-policy";

export class ReportOperationNotAllowedError extends Error {
  constructor() {
    super("보고서 처리 권한, 제출 기간 또는 파일 상태를 확인해 주세요.");
    this.name = "ReportOperationNotAllowedError";
  }
}

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  async get(actor: CurrentActor, teamId: string) {
    const workspace = await this.repository.findWorkspace(teamId, actor);
    if (!workspace) throw new ReportOperationNotAllowedError();
    return workspace;
  }

  async submit(actor: CurrentActor, input: {
    teamId: string;
    type: ReportType;
    fileId: string;
    description: string;
  }, now = new Date()) {
    if (actor.role === "PROFESSOR") throw new ReportOperationNotAllowedError();
    const result = await this.repository.submit({
      ...input,
      actor,
      description: normalizeDescription(input.description),
      submittedAt: now,
    });
    if (!result) throw new ReportOperationNotAllowedError();
    return result;
  }

  async decide(actor: CurrentActor, input: {
    reportVersionId: string;
    decision: ApprovalDecision;
    comment: string;
  }, now = new Date()) {
    if (actor.role === "STUDENT") throw new ReportOperationNotAllowedError();
    const decided = await this.repository.decide({
      ...input,
      actor,
      comment: normalizeDecisionComment(input.decision, input.comment),
      decidedAt: now,
    });
    if (!decided) throw new ReportOperationNotAllowedError();
  }

  async registerArtifact(actor: CurrentActor, input: {
    teamId: string;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
  }, now = new Date()) {
    if (actor.role === "PROFESSOR" || (!!input.fileId === !!input.externalUrl)) {
      throw new ReportOperationNotAllowedError();
    }
    const normalized = normalizeArtifact(input);
    const result = await this.repository.registerArtifact({
      ...input,
      ...normalized,
      actor,
      createdAt: now,
    });
    if (!result) throw new ReportOperationNotAllowedError();
    return result;
  }
}

export { InvalidReportInputError };
