import type { UserRole } from "@/modules/identity/domain/user-role";

export type CurrentActor = {
  id: string;
  role: UserRole;
};
