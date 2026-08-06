import { NextResponse } from "next/server";
import { z } from "zod";

import { profileImageService } from "@/app/api/profile-images/_lib/profile-image-service";
import { ProfileImageNotFoundError } from "@/modules/identity/application/manage-profile-image";
import { InvalidProfileImageError } from "@/modules/identity/domain/profile-image-policy";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { readLimitedJson, RequestBodyTooLargeError } from "@/shared/http/read-limited-json";

const inputSchema = z.object({
  originalName: z.string(),
  contentType: z.string(),
  size: z.number(),
  sha256: z.string(),
});

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  let body: unknown;
  try {
    body = await readLimitedJson(request, 16 * 1_024);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof RequestBodyTooLargeError ? error.message : "올바른 JSON 요청이 아닙니다." },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "업로드할 사진 정보를 다시 확인해 주세요." }, { status: 400 });
  try {
    return NextResponse.json(await profileImageService().create(actor, parsed.data));
  } catch (error) {
    if (error instanceof InvalidProfileImageError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof ProfileImageNotFoundError) return NextResponse.json({ message: error.message }, { status: 429 });
    throw error;
  }
}
