import { headers } from "next/headers";

import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { auth } from "@/modules/identity/infrastructure/auth";

export async function getCurrentActor(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };
}
