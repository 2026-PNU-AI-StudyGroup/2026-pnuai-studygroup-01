import { NextResponse } from "next/server";

import { uploadService } from "@/app/api/uploads/_lib/upload-service";
import { UploadNotFoundError } from "@/modules/file/application/manage-upload";
import { InvalidUploadError } from "@/modules/file/domain/upload-policy";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const { uploadId } = await params;
  if (!request.body) {
    return NextResponse.json({ message: "업로드할 파일 내용이 없습니다." }, { status: 400 });
  }
  try {
    await uploadService().writeContent(actor, uploadId, request.body);
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof UploadNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
