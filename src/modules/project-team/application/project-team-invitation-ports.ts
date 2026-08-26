import type { ProjectTeamInvitationViolation } from "@/modules/project-team/domain/project-team-invitation-policy";

export type ProjectTeamInvitationSummary = {
  id: string;
  email: string;
  inviteeName: string | null;
  invitedByName: string;
  createdAt: Date;
};

/** 초대를 받은 사람이 보는 정보. 어느 프로젝트에 들어가는지 알아야 판단할 수 있다. */
export type ReceivedProjectTeamInvitation = {
  id: string;
  projectId: string;
  projectTitle: string;
  teamName: string;
  programName: string;
  invitedByName: string;
  createdAt: Date;
};

export type InviteProjectTeamMemberOutcome =
  | { status: "INVITED" }
  | { status: "NOT_FOUND" }
  | { status: ProjectTeamInvitationViolation };

export type RespondProjectTeamInvitationOutcome =
  | "ACCEPTED"
  | "DECLINED"
  | "NOT_FOUND"
  | "CAPACITY_REACHED"
  | "PROGRAM_CLOSED";

export interface ProjectTeamInvitationRepository {
  invite(input: {
    projectTeamId: string;
    actorId: string;
    email: string;
    invitedAt: Date;
  }): Promise<InviteProjectTeamMemberOutcome>;

  cancel(input: {
    invitationId: string;
    actorId: string;
    canceledAt: Date;
  }): Promise<boolean>;

  respond(input: {
    invitationId: string;
    inviteeId: string;
    inviteeEmail: string;
    accept: boolean;
    respondedAt: Date;
  }): Promise<RespondProjectTeamInvitationOutcome>;

  listPending(projectTeamId: string): Promise<ProjectTeamInvitationSummary[]>;

  listReceived(inviteeId: string, email: string): Promise<ReceivedProjectTeamInvitation[]>;
}
