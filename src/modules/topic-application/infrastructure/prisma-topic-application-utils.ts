export function areActiveStudents(
  users: Array<{
    role: "STUDENT" | "PROFESSOR" | "ADMIN";
    accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  }>,
  expectedCount: number,
): boolean {
  return users.length === expectedCount && users.every(
    ({ role, accountStatus }) => role === "STUDENT" && accountStatus === "ACTIVE",
  );
}
