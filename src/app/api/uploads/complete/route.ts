import { NextResponse } from "next/server";
import { z } from "zod";

import { uploadService } from "@/app/api/uploads/service";
import { UploadNotFoundError } from "@/modules/file/application/manage-upload";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { readLimitedJson, RequestBodyTooLargeError } from "@/shared/http/read-limited-json";

const maximumRequestBytes = 4 * 1_024;

const inputSchema = z.object({ uploadId: z.string().uuid() });

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  let body: unknown;
  try {
    body = await readLimitedJson(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: error.message }, { status: 413 });
    }
    return NextResponse.json({ message: "올바른 JSON 요청이 아닙니다." }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
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
