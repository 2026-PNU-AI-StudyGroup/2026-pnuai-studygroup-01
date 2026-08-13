import { NextResponse } from "next/server";

import { prisma } from "@/shared/infrastructure/database/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await params;
  const projectTeam = await prisma.projectTeam.findUnique({
    where: { id: teamId },
    select: { projectId: true },
  });
  if (!projectTeam) {
    return NextResponse.json({ message: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.redirect(
    new URL(`/api/projects/${projectTeam.projectId}/submissions`, request.url),
    308,
  );
}
