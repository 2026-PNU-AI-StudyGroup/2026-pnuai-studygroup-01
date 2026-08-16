import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { buildZip, submissionEntryName, uniqueZipName, type ZipEntry } from "@/app/api/teams/[teamId]/submissions/_lib/zip";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { teamActorWhere } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export async function downloadProjectSubmissions(projectId: string) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });

  const projectTeam = await prisma.projectTeam.findFirst({
    where: { projectId, ...teamActorWhere(actor) },
    select: { id: true, name: true },
  });
  if (!projectTeam) {
    return NextResponse.json({ message: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const files = await prisma.storedFile.findMany({
    where: { projectTeamId: projectTeam.id, status: "ATTACHED" },
    orderBy: { createdAt: "asc" },
    select: {
      objectKey: true,
      originalName: true,
      purpose: true,
      reportVersion: { select: { version: true, report: { select: { titleSnapshot: true } } } },
    },
  });
  if (files.length === 0) {
    return NextResponse.json({ message: "다운로드할 제출물이 없습니다." }, { status: 404 });
  }

  const taken = new Set<string>();
  const entries: ZipEntry[] = [];
  await Promise.all(files.map(async (file) => {
    if (file.purpose === "ANNOUNCEMENT") return;
    const object = await s3.send(new GetObjectCommand({ Bucket: objectStorageBucket, Key: file.objectKey }));
    const data = await object.Body?.transformToByteArray();
    if (!data) return;
    entries.push({ name: uniqueZipName(taken, submissionEntryName(file)), data });
  }));
  if (entries.length === 0) {
    return NextResponse.json({ message: "다운로드할 제출물이 없습니다." }, { status: 404 });
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));

  const zip = buildZip(entries);
  const downloadName = `${projectTeam.name}-submissions.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.length),
      "Content-Disposition": `attachment; filename="submissions.zip"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    },
  });
}
