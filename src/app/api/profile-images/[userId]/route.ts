import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { PrismaProfileImageRepository } from "@/modules/identity/infrastructure/prisma-profile-image-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const { userId } = await params;
  if (!userId || userId.length > 255) return NextResponse.json({ message: "사진을 찾을 수 없습니다." }, { status: 404 });
  const image = await new PrismaProfileImageRepository(prisma).findVisibleForActor(userId, actor);
  if (!image) return NextResponse.json({ message: "사진을 찾을 수 없습니다." }, { status: 404 });
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: objectStorageBucket,
      Key: image.objectKey,
    }));
    const body = result.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined;
    if (!body?.transformToWebStream) throw new Error("객체 내용을 읽을 수 없습니다.");
    return new Response(body.transformToWebStream(), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": image.contentType,
        "Content-Length": String(image.size),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "사진을 불러올 수 없습니다." }, { status: 404 });
  }
}
