import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const { fileId } = await params;
  const file = await prisma.storedFile.findFirst({
    where: {
      id: fileId,
      status: "ATTACHED",
      OR: [
        { team: teamActorWhere(actor) },
        { purpose: "ARTIFACT", team: { status: "CLOSED" } },
      ],
    },
    select: { objectKey: true, originalName: true },
  });
  if (!file) return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: objectStorageBucket,
    Key: file.objectKey,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
  }), { expiresIn: 5 * 60 });
  return NextResponse.redirect(url);
}

function teamActorWhere(actor: { id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN" }): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "PROFESSOR") return { professorId: actor.id };
  return { members: { some: { studentId: actor.id } } };
}
