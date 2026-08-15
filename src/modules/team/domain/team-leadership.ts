export type ExecutionTeamMemberRole = "LEADER" | "MEMBER";

export function roleForAcceptedTeamMember(
  existingMemberCount: number,
  isApplicationLeader = true,
): ExecutionTeamMemberRole {
  return existingMemberCount === 0 && isApplicationLeader ? "LEADER" : "MEMBER";
}
