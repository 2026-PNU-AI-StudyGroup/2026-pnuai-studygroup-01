export function areActiveStudents(
  users: Array<{ role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>,
  expectedCount: number,
): boolean {
  return users.length === expectedCount && users.every(({ role, isActive }) => role === "STUDENT" && isActive);
}
