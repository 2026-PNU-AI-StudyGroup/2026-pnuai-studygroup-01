export const USER_ROLES = ["STUDENT", "PROFESSOR", "ADMIN", "ADVISOR"] as const;

export type UserRole = (typeof USER_ROLES)[number];

type InitialRoleInput = {
  isProfessorAllowlisted: boolean;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPusanEmail(email: string): boolean {
  return normalizeEmail(email).endsWith("@pusan.ac.kr");
}

export function canProvisionInstitutionUser(
  email: string,
  emailVerified: boolean,
): boolean {
  return emailVerified && isPusanEmail(email);
}

export function determineInitialRole({
  isProfessorAllowlisted,
}: InitialRoleInput): UserRole {
  return isProfessorAllowlisted ? "PROFESSOR" : "STUDENT";
}
