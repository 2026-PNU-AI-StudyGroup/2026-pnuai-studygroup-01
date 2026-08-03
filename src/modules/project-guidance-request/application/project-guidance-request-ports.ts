import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ProjectGuidanceRequestKind,
  ProjectGuidanceRequestStatus,
} from "@/modules/project-guidance-request/domain/project-guidance-request-policy";

export type ProjectGuidanceRequestItem = {
  id: string;
  teamId: string;
  requesterId: string;
  requesterName: string;
  kind: ProjectGuidanceRequestKind;
  title: string;
  content: string;
  referenceUrl: string | null;
  preferredAt: Date | null;
  status: ProjectGuidanceRequestStatus;
  response: string | null;
  scheduledAt: Date | null;
  responderName: string | null;
  respondedAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
};

export type ProjectGuidanceRequestPage = {
  items: ProjectGuidanceRequestItem[];
  page: number;
  totalPages: number;
  total: number;
  pendingTotal: number;
};

export type CreateProjectGuidanceRequestResult =
  | "CREATED"
  | "PENDING_EXISTS"
  | "NOT_ALLOWED";

export interface ProjectGuidanceRequestReader {
  findPage(
    teamId: string,
    actor: CurrentActor,
    requestedPage: number,
    pageSize: number,
  ): Promise<ProjectGuidanceRequestPage | null>;
}

export interface ProjectGuidanceRequestWriter {
  create(input: {
    teamId: string;
    actor: CurrentActor;
    kind: ProjectGuidanceRequestKind;
    title: string;
    content: string;
    referenceUrl: string | null;
    preferredAt: Date | null;
    requestedAt: Date;
  }): Promise<CreateProjectGuidanceRequestResult>;
  respond(input: {
    requestId: string;
    actor: CurrentActor;
    response: string;
    scheduledAt: Date | null;
    respondedAt: Date;
  }): Promise<boolean>;
  cancel(input: {
    requestId: string;
    actor: CurrentActor;
    canceledAt: Date;
  }): Promise<boolean>;
}
