type StudentTeamMemberSummary = {
  studentId: string;
  name: string;
  email: string;
  role: "LEADER" | "MEMBER";
  joinedAt: Date;
  profile: { phone: string; kakao: string; github: string; instagram: string } | null;
};

type StudentTeamInvitationSummary = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  createdAt: Date;
};

export type StudentTeamSummary = {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  members: StudentTeamMemberSummary[];
  invitations: StudentTeamInvitationSummary[];
  openRecruitmentCount: number;
  pendingApplicantCount: number;
  createdAt: Date;
};

export type ReceivedStudentTeamInvitation = {
  id: string;
  teamId: string;
  teamName: string;
  leaderName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  createdAt: Date;
};

export interface StudentTeamReader {
  listMine(studentId: string): Promise<StudentTeamSummary[]>;
  listInvitations(email: string): Promise<ReceivedStudentTeamInvitation[]>;
}

export interface StudentTeamWriter {
  create(input: { leaderId: string; name: string; description: string; createdAt: Date }): Promise<string>;
  invite(input: { teamId: string; leaderId: string; email: string; invitedAt: Date }): Promise<"INVITED" | "NOT_FOUND" | "FORBIDDEN" | "ALREADY_MEMBER">;
  respond(input: { invitationId: string; studentId: string; email: string; decision: "ACCEPT" | "DECLINE"; respondedAt: Date }): Promise<"ACCEPTED" | "DECLINED" | "NOT_FOUND" | "CONFLICT">;
  cancelInvitation(input: { invitationId: string; leaderId: string }): Promise<boolean>;
  transferLeadership(input: { teamId: string; leaderId: string; nextLeaderId: string; changedAt: Date }): Promise<boolean>;
  removeMember(input: { teamId: string; leaderId: string; studentId: string; changedAt: Date }): Promise<boolean>;
  leave(input: { teamId: string; studentId: string; leftAt: Date }): Promise<"LEFT" | "NOT_FOUND" | "LEADER_TRANSFER_REQUIRED">;
  delete(input: { teamId: string; leaderId: string; deletedAt: Date }): Promise<boolean>;
}
