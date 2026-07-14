import { NextResponse } from "next/server";
import { z } from "zod";

import { uploadService } from "@/app/api/uploads/service";
import { UploadNotFoundError } from "@/modules/file/application/manage-upload";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

const inputSchema = z.object({ uploadId: z.string().uuid() });

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  try {
    return NextResponse.json(await uploadService().complete(actor, parsed.data.uploadId));
  } catch (error) {
    if (error instanceof UploadNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
}
