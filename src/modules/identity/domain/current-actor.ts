import type { UserRole } from "@/modules/identity/domain/user-role";

export type CurrentActor = {
  id: string;
  role: UserRole;
};

export type CurrentUser = CurrentActor & {
  name: string;
  email: string;
  image: string | null;
};
