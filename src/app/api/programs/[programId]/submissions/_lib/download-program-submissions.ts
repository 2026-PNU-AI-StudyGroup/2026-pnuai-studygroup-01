import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  buildZip,
  MAX_ZIP_TOTAL_BYTES,
  safePathSegment,
  submissionEntryName,
  uniqueZipName,
  ZIP_FETCH_CONCURRENCY,
  type ZipEntry,
} from "@/app/api/teams/[teamId]/submissions/_lib/zip";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export async function downloadProgramSubmissions(programId: string, teamIds: string[] | null) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  if (actor.role !== "ADMIN") return new Response(null, { status: 404 });

  const program = await prisma.projectProgram.findUnique({
    where: { id: programId },
    select: { name: true },
  });
  if (!program) return NextResponse.json({ message: "프로그램을 찾을 수 없습니다." }, { status: 404 });

  const teams = await prisma.projectTeam.findMany({
    where: {
      project: { programId },
      ...(teamIds ? { id: { in: teamIds } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (teams.length === 0) {
    return NextResponse.json({ message: "선택한 팀을 찾을 수 없습니다." }, { status: 404 });
  }
  const teamFolders = new Map(teams.map((team) => [team.id, safePathSegment(team.name)]));

  const files = await prisma.storedFile.findMany({
    where: {
      projectTeamId: { in: teams.map(({ id }) => id) },
      status: "ATTACHED",
      purpose: { not: "ANNOUNCEMENT" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      objectKey: true,
      originalName: true,
      size: true,
      projectTeamId: true,
      reportVersion: { select: { version: true, report: { select: { titleSnapshot: true } } } },
    },
  });
  if (files.length === 0) {
    return NextResponse.json({ message: "다운로드할 제출물이 없습니다." }, { status: 404 });
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_ZIP_TOTAL_BYTES) {
    return NextResponse.json(
      { message: "선택한 제출물이 너무 큽니다. 팀을 나눠 내려받아 주세요." },
      { status: 413 },
    );
  }

  const taken = new Set<string>();
  const entries: ZipEntry[] = [];
  for (let index = 0; index < files.length; index += ZIP_FETCH_CONCURRENCY) {
    await Promise.all(files.slice(index, index + ZIP_FETCH_CONCURRENCY).map(async (file) => {
      const object = await s3.send(new GetObjectCommand({ Bucket: objectStorageBucket, Key: file.objectKey }));
      const data = await object.Body?.transformToByteArray();
      if (!data) return;
      const folder = file.projectTeamId ? teamFolders.get(file.projectTeamId) : null;
      const name = folder ? `${folder}/${submissionEntryName(file)}` : submissionEntryName(file);
      entries.push({ name: uniqueZipName(taken, name), data });
    }));
  }
  if (entries.length === 0) {
    return NextResponse.json({ message: "다운로드할 제출물이 없습니다." }, { status: 404 });
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));

  const zip = buildZip(entries);
  const downloadName = `${program.name}-submissions.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.length),
      "Content-Disposition": `attachment; filename="submissions.zip"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    },
  });
}
