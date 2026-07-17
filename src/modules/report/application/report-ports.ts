import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ApprovalDecision,
  ArtifactType,
  ReportType,
} from "@/modules/report/domain/report-policy";

export type ReportWorkspace = {
  reports: Array<{
    id: string;
    type: ReportType;
    dueAt: Date;
    versions: Array<{
      id: string;
      version: number;
      fileId: string;
      fileName: string;
      description: string;
      submittedAt: Date;
      submitterName: string;
      decision?: {
        decision: ApprovalDecision;
        comment: string;
        decidedAt: Date;
        reviewerName: string;
      };
    }>;
  }>;
  artifacts: Array<{
    id: string;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
    createdAt: Date;
  }>;
};

export interface ReportRepository {
  findWorkspace(teamId: string, actor: CurrentActor): Promise<ReportWorkspace | null>;
  setRequirement(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    dueAt: Date;
    configuredAt: Date;
  }): Promise<{ id: string } | null>;
  removeRequirement(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    removedAt: Date;
  }): Promise<boolean>;
  submit(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    fileId: string;
    description: string;
    submittedAt: Date;
  }): Promise<{ reportId: string; version: number } | null>;
  decide(input: {
    reportVersionId: string;
    actor: CurrentActor;
    decision: ApprovalDecision;
    comment: string;
    decidedAt: Date;
  }): Promise<boolean>;
  registerArtifact(input: {
    teamId: string;
    actor: CurrentActor;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
    createdAt: Date;
  }): Promise<{ id: string } | null>;
}
