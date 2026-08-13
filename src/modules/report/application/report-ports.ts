import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ApprovalDecision,
  ArtifactType,
} from "@/modules/report/domain/report-policy";

export type ReportWorkspace = {
  reports: Array<{
    id: string;
    title: string;
    position: number;
    required: boolean;
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
    feedback: Array<{
      id: string;
      authorName: string;
      authorRole: "STUDENT" | "PROFESSOR" | "ADMIN";
      body: string;
      createdAt: Date;
    }>;
  }>;
  artifacts: Array<{
    id: string;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
    position: number;
    createdAt: Date;
  }>;
  thumbnailPath?: string;
};

export interface ReportWorkspaceReader {
  findWorkspace(teamId: string, actor: CurrentActor): Promise<ReportWorkspace | null>;
}

export interface ReportSubmissionWriter {
  submit(input: {
    teamId: string;
    reportId: string;
    actor: CurrentActor;
    fileId: string;
    description: string;
    submittedAt: Date;
  }): Promise<{ reportId: string; version: number } | null>;
}

export interface ReportDecisionWriter {
  decide(input: {
    reportVersionId: string;
    actor: CurrentActor;
    decision: ApprovalDecision;
    comment: string;
    decidedAt: Date;
  }): Promise<boolean>;
}

export interface ReportFeedbackWriter {
  add(input: {
    reportId: string;
    actor: CurrentActor;
    body: string;
    createdAt: Date;
  }): Promise<boolean>;
}

export interface ArtifactWriter {
  registerArtifact(input: {
    teamId: string;
    actor: CurrentActor;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
    createdAt: Date;
  }): Promise<{ id: string } | null>;
  updateArtifact(input: {
    artifactId: string;
    teamId: string;
    actor: CurrentActor;
    type: ArtifactType;
    title: string;
    updatedAt: Date;
  }): Promise<boolean>;
  removeArtifact(input: {
    artifactId: string;
    teamId: string;
    actor: CurrentActor;
    removedAt: Date;
  }): Promise<boolean>;
  setThumbnail(input: {
    teamId: string;
    actor: CurrentActor;
    fileId: string | null;
    updatedAt: Date;
  }): Promise<boolean>;
  reorderArtifacts(input: {
    teamId: string;
    actor: CurrentActor;
    orderedIds: string[];
    reorderedAt: Date;
  }): Promise<boolean>;
}
