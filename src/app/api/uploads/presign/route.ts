import { NextResponse } from "next/server";
import { z } from "zod";

import { uploadService } from "@/app/api/uploads/service";
import { UploadNotFoundError } from "@/modules/file/application/manage-upload";
import { InvalidUploadError } from "@/modules/file/domain/upload-policy";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

const inputSchema = z.object({
  teamId: z.string().uuid(),
  purpose: z.enum(["REPORT", "ARTIFACT"]),
  originalName: z.string(),
  contentType: z.string(),
  size: z.number(),
  sha256: z.string(),
});

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  try {
    return NextResponse.json(await uploadService().create(actor, parsed.data));
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof UploadNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
}
