import { NextResponse } from "next/server";

import { profileImageService } from "@/app/api/profile-images/_lib/profile-image-service";
import { InvalidUploadError } from "@/modules/file/domain/upload-policy";
import { ProfileImageNotFoundError } from "@/modules/identity/application/manage-profile-image";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const { uploadId } = await params;
  if (!request.body) {
    return NextResponse.json({ message: "업로드할 사진 내용이 없습니다." }, { status: 400 });
  }
  try {
    await profileImageService().writeContent(actor, uploadId, request.body);
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof ProfileImageNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
