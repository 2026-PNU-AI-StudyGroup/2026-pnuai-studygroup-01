import type { UserRole } from "@/modules/identity/domain/user-role";

export function areActiveStudents(
  users: Array<{
    role: UserRole;
    accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  }>,
  expectedCount: number,
): boolean {
  return users.length === expectedCount && users.every(
    ({ role, accountStatus }) => role === "STUDENT" && accountStatus === "ACTIVE",
  );
}
