import { GetObjectCommand } from "@aws-sdk/client-s3";

import type { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { teamFileAccessWhere } from "@/modules/advisor/infrastructure/advisor-file-access";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { announcementScopeWhere } from "@/modules/announcement/infrastructure/prisma-announcement-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const { fileId } = await params;
  const announcementAudience = await resolveAnnouncementAudience(actor);
  // 접근 사유마다 따로 조회한다. 한 OR 안에 모으면 관리자처럼 제한이 없는 조건이 빈 객체가 되고,
  // Prisma 는 OR 안의 빈 가지를 참이 아니라 거짓으로 취급해 조건 전체가 죽는다.
  const accessReasons: Prisma.StoredFileWhereInput[] = [
    { projectTeam: teamFileAccessWhere(actor) },
    // 공개 결과물은 프로그램이 끝나기를 기다리지 않는다. 프로젝트 상세가 보이는 조건과 같게 둔다.
    {
      purpose: "ARTIFACT",
      projectTeam: {
        project: {
          status: "ACTIVE",
          ...(actor.role === "ADMIN" ? {} : { program: { isPublic: true } }),
        },
      },
    },
    { announcementAttachment: { announcement: announcementScopeWhere(announcementAudience) } },
  ];
  let file: { objectKey: string; originalName: string; contentType: string; size: number } | null = null;
  for (const reason of accessReasons) {
    file = await prisma.storedFile.findFirst({
      where: { id: fileId, status: "ATTACHED", ...reason },
      select: { objectKey: true, originalName: true, contentType: true, size: true },
    });
    if (file) break;
  }
  if (!file) return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
  // 서명 URL 로 넘기면 브라우저가 내부 전용 스토리지 주소로 이동하게 된다. 앱이 직접 내려준다.
  let body: ReadableStream<Uint8Array>;
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: objectStorageBucket,
      Key: file.objectKey,
    }));
    const stream = result.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined;
    if (!stream?.transformToWebStream) throw new Error("객체 내용을 읽을 수 없습니다.");
    body = stream.transformToWebStream();
  } catch {
    return NextResponse.json({ message: "파일을 불러올 수 없습니다." }, { status: 404 });
  }
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
