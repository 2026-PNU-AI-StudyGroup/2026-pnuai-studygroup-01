import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ArtifactWriter,
  ReportDecisionWriter,
  ReportFeedbackWriter,
  ReportSubmissionWriter,
  ReportWorkspaceReader,
} from "@/modules/report/application/report-ports";
import {
  type ApprovalDecision,
  type ArtifactType,
  InvalidReportInputError,
  normalizeArtifact,
  normalizeDecisionComment,
  normalizeDescription,
  normalizeReportFeedback,
} from "@/modules/report/domain/report-policy";

export class ReportOperationNotAllowedError extends Error {
  constructor() {
    super("보고서 처리 권한, 제출 기간 또는 파일 상태를 확인해 주세요.");
    this.name = "ReportOperationNotAllowedError";
  }
}

export class ReportQueryService {
  constructor(private readonly workspaceReader: ReportWorkspaceReader) {}

  async get(actor: CurrentActor, teamId: string) {
    const workspace = await this.workspaceReader.findWorkspace(teamId, actor);
    if (!workspace) throw new ReportOperationNotAllowedError();
    return workspace;
  }
}

export class ReportSubmissionService {
  constructor(private readonly submissionWriter: ReportSubmissionWriter) {}

  async submit(actor: CurrentActor, input: {
    teamId: string;
    reportId: string;
    fileId: string;
    description: string;
  }, now = new Date()) {
    const result = await this.submissionWriter.submit({
      ...input,
      actor,
      description: normalizeDescription(input.description),
      submittedAt: now,
    });
    if (!result) throw new ReportOperationNotAllowedError();
    return result;
  }
}

export class ReportDecisionService {
  constructor(private readonly decisionWriter: ReportDecisionWriter) {}

  async decide(actor: CurrentActor, input: {
    reportVersionId: string;
    decision: ApprovalDecision;
    comment: string;
  }, now = new Date()) {
    const decided = await this.decisionWriter.decide({
      ...input,
      actor,
      comment: normalizeDecisionComment(input.decision, input.comment),
      decidedAt: now,
    });
    if (!decided) throw new ReportOperationNotAllowedError();
  }
}

export class ArtifactRegistrationService {
  constructor(private readonly artifactWriter: ArtifactWriter) {}

  async registerArtifact(actor: CurrentActor, input: {
    teamId: string;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
  }, now = new Date()) {
    if (!!input.fileId === !!input.externalUrl) {
      throw new ReportOperationNotAllowedError();
    }
    const normalized = normalizeArtifact(input);
    const result = await this.artifactWriter.registerArtifact({
      ...input,
      ...normalized,
      actor,
      createdAt: now,
    });
    if (!result) throw new ReportOperationNotAllowedError();
    return result;
  }
}

export class ArtifactManagementService {
  constructor(private readonly artifactWriter: ArtifactWriter) {}

  async updateArtifact(actor: CurrentActor, input: {
    artifactId: string;
    teamId: string;
    type: ArtifactType;
    title: string;
  }, now = new Date()) {
    const normalized = normalizeArtifact(input);
    const updated = await this.artifactWriter.updateArtifact({
      ...input,
      ...normalized,
      actor,
      updatedAt: now,
    });
    if (!updated) throw new ReportOperationNotAllowedError();
  }

  async removeArtifact(actor: CurrentActor, input: {
    artifactId: string;
    teamId: string;
  }, now = new Date()) {
    const removed = await this.artifactWriter.removeArtifact({
      ...input,
      actor,
      removedAt: now,
    });
    if (!removed) throw new ReportOperationNotAllowedError();
  }

  async setThumbnail(actor: CurrentActor, input: {
    teamId: string;
    fileId: string | null;
  }, now = new Date()) {
    const updated = await this.artifactWriter.setThumbnail({
      ...input,
      actor,
      updatedAt: now,
    });
    if (!updated) throw new ReportOperationNotAllowedError();
  }

  async reorderArtifacts(actor: CurrentActor, input: {
    teamId: string;
    orderedIds: string[];
  }, now = new Date()) {
    const reordered = await this.artifactWriter.reorderArtifacts({
      ...input,
      actor,
      reorderedAt: now,
    });
    if (!reordered) throw new ReportOperationNotAllowedError();
  }
}

export class ReportFeedbackService {
  constructor(private readonly feedbackWriter: ReportFeedbackWriter) {}

  async add(actor: CurrentActor, input: {
    reportId: string;
    body: string;
  }, now = new Date()) {
    const added = await this.feedbackWriter.add({
      reportId: input.reportId,
      actor,
      body: normalizeReportFeedback(input.body),
      createdAt: now,
    });
    if (!added) throw new ReportOperationNotAllowedError();
  }
}

export { InvalidReportInputError };
