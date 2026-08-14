import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export type ProjectAssistantSummary = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

export type ProjectAssistantInvitationSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  inviterName: string;
  advisorEnabled: boolean;
  createdAt: Date;
};

export type ProjectAssistantManagement = {
  topicId: string;
  topicTitle: string;
  managerId: string | null;
  managerName: string | null;
  advisorEnabled: boolean;
  assistants: ProjectAssistantSummary[];
  pendingInvitations: Array<{
    id: string;
    inviteeId: string;
    inviteeName: string;
    inviteeEmail: string;
    inviteeRole: UserRole;
    createdAt: Date;
  }>;
};

export interface ProjectAssistantReader {
  hasSupervisedTopic(actor: CurrentActor): Promise<boolean>;
  findManagement(
    topicId: string,
    actor: CurrentActor,
  ): Promise<ProjectAssistantManagement | null>;
  listPendingInvitations(
    inviteeId: string,
  ): Promise<ProjectAssistantInvitationSummary[]>;
}

export type InviteProjectAssistantResult =
  | "INVITED"
  | "NOT_FOUND"
  | "INACTIVE"
  | "SELF"
  | "ALREADY_ASSISTANT"
  | "ALREADY_INVITED"
  | "FORBIDDEN";

export interface ProjectAssistantWriter {
  invite(input: {
    topicId: string;
    actor: CurrentActor;
    email: string;
    invitedAt: Date;
  }): Promise<InviteProjectAssistantResult>;
  respond(input: {
    invitationId: string;
    actor: CurrentActor;
    decision: "ACCEPT" | "DECLINE";
    respondedAt: Date;
  }): Promise<"ACCEPTED" | "DECLINED" | "INVALID">;
  cancelInvitation(input: {
    invitationId: string;
    actor: CurrentActor;
    canceledAt: Date;
  }): Promise<boolean>;
  remove(input: {
    topicId: string;
    assistantUserId: string;
    actor: CurrentActor;
    removedAt: Date;
  }): Promise<boolean>;
}
