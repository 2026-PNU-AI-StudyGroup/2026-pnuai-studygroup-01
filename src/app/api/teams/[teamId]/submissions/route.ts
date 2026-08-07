import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { teamSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";
import { buildZip, uniqueZipName, type ZipEntry } from "@/app/api/teams/[teamId]/submissions/_lib/zip";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  const { teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, ...teamActorWhere(actor) },
    select: { id: true, name: true },
  });
  if (!team) return NextResponse.json({ message: "팀을 찾을 수 없습니다." }, { status: 404 });

  const files = await prisma.storedFile.findMany({
    where: { teamId, status: "ATTACHED" },
    orderBy: { createdAt: "asc" },
    select: {
      objectKey: true,
      originalName: true,
      purpose: true,
      reportVersion: { select: { version: true, report: { select: { type: true } } } },
    },
  });
  if (files.length === 0) {
    return NextResponse.json({ message: "다운로드할 제출물이 없습니다." }, { status: 404 });
  }

  const taken = new Set<string>();
  const entries: ZipEntry[] = [];
  await Promise.all(files.map(async (file) => {
    const object = await s3.send(new GetObjectCommand({ Bucket: objectStorageBucket, Key: file.objectKey }));
    const data = await object.Body?.transformToByteArray();
    if (!data) return;
    const name = uniqueZipName(taken, entryName(file));
    entries.push({ name, data });
  }));
  if (entries.length === 0) {
    return NextResponse.json({ message: "다운로드할 제출물이 없습니다." }, { status: 404 });
  }
  // Preserve a stable order regardless of which S3 fetch resolved first.
  entries.sort((left, right) => left.name.localeCompare(right.name));

  const zip = buildZip(entries);
  const downloadName = `${team.name}-submissions.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.length),
      "Content-Disposition": `attachment; filename="submissions.zip"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    },
  });
}

type SubmissionFile = {
  originalName: string;
  purpose: "REPORT" | "ARTIFACT";
  reportVersion: { version: number; report: { type: string } } | null;
};

function entryName(file: SubmissionFile): string {
  if (file.reportVersion) {
    return `reports/${file.reportVersion.report.type}_v${file.reportVersion.version}_${file.originalName}`;
  }
  return `artifacts/${file.originalName}`;
}

function teamActorWhere(actor: { id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN" }): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    OR: [
      teamSupervisorWhere(actor),
      { members: { some: { studentId: actor.id } } },
    ],
  };
}
