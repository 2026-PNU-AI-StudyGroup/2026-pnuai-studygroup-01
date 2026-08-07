import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

function notFound() {
  return NextResponse.json({ message: "이미지를 찾을 수 없습니다." }, { status: 404 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  if (!imageId || imageId.length > 255) return notFound();

  const image = await prisma.showcaseImage.findUnique({
    where: { id: imageId },
    select: { fileId: true, showcase: { select: { isPublished: true, teamId: true } } },
  });
  if (!image) return notFound();

  // 미게시 쇼케이스 이미지는 팀원·담당교수·관리자만 미리볼 수 있다.
  if (!image.showcase.isPublished) {
    const actor = await getCurrentActor();
    if (!actor) return notFound();
    const team = await prisma.team.findUnique({
      where: { id: image.showcase.teamId },
      select: { professorId: true },
    });
    const isEditor =
      actor.role === "ADMIN" ||
      team?.professorId === actor.id ||
      Boolean(await prisma.teamMember.findFirst({
        where: { teamId: image.showcase.teamId, studentId: actor.id },
        select: { id: true },
      }));
    if (!isEditor) return notFound();
  }

  const file = await prisma.storedFile.findUnique({
    where: { id: image.fileId },
    select: { objectKey: true, contentType: true, size: true },
  });
  if (!file) return notFound();

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: objectStorageBucket, Key: file.objectKey }));
    const body = result.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined;
    if (!body?.transformToWebStream) throw new Error("객체 내용을 읽을 수 없습니다.");
    return new Response(body.transformToWebStream(), {
      headers: {
        "Cache-Control": image.showcase.isPublished ? "public, max-age=3600" : "private, no-store",
        "Content-Type": file.contentType,
        "Content-Length": String(file.size),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
