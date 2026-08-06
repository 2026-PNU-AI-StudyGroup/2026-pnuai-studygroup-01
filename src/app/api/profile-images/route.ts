import { NextResponse } from "next/server";

import { profileImageService } from "@/app/api/profile-images/_lib/profile-image-service";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

export async function DELETE() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  await profileImageService().remove(actor);
  return new Response(null, { status: 204 });
}
