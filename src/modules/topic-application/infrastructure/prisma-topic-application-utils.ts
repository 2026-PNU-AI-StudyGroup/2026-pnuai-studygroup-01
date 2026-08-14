import type { UserRole } from "@/modules/identity/domain/user-role";

export function areActiveStudents(
  users: Array<{ role: UserRole; isActive: boolean }>,
  expectedCount: number,
): boolean {
  return users.length === expectedCount && users.every(({ role, isActive }) => role === "STUDENT" && isActive);
}
