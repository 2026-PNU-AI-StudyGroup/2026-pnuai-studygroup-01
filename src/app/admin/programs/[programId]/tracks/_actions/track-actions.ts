"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TrackActionState = { status: "idle" | "error" | "success"; message: string };

const idSchema = z.string().uuid();

async function requireAdmin() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") return null;
  return actor;
}

export async function createTrackAction(
  programId: string,
  _previous: TrackActionState,
  formData: FormData,
): Promise<TrackActionState> {
  if (!(await requireAdmin())) return { status: "error", message: "트랙은 관리자만 관리할 수 있습니다." };
  if (!idSchema.safeParse(programId).success) return { status: "error", message: "프로그램을 찾을 수 없습니다." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 40) return { status: "error", message: "트랙 이름은 1자 이상 40자 이내로 입력해 주세요." };

  const count = await prisma.programTrack.count({ where: { programId } });
  try {
    await prisma.programTrack.create({ data: { programId, name, position: count } });
  } catch {
    return { status: "error", message: "이미 있는 트랙 이름입니다." };
  }
  revalidatePath(`/admin/programs/${programId}`);
  return { status: "success", message: "트랙을 추가했습니다." };
}

export async function deleteTrackAction(
  trackId: string,
  _previous: TrackActionState,
  _formData: FormData,
): Promise<TrackActionState> {
  void _formData;
  if (!(await requireAdmin())) return { status: "error", message: "트랙은 관리자만 관리할 수 있습니다." };
  const track = await prisma.programTrack.findUnique({ where: { id: trackId }, select: { programId: true } });
  if (!track) return { status: "error", message: "트랙을 찾을 수 없습니다." };
  await prisma.programTrack.delete({ where: { id: trackId } });
  revalidatePath(`/admin/programs/${track.programId}`);
  return { status: "success", message: "트랙을 삭제했습니다." };
}

export async function moveTrackAction(
  trackId: string,
  direction: "up" | "down",
  _previous: TrackActionState,
  _formData: FormData,
): Promise<TrackActionState> {
  void _formData;
  if (!(await requireAdmin())) return { status: "error", message: "트랙은 관리자만 관리할 수 있습니다." };
  const track = await prisma.programTrack.findUnique({ where: { id: trackId }, select: { programId: true, position: true } });
  if (!track) return { status: "error", message: "트랙을 찾을 수 없습니다." };
  const neighbor = await prisma.programTrack.findFirst({
    where: {
      programId: track.programId,
      position: direction === "up" ? { lt: track.position } : { gt: track.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
    select: { id: true, position: true },
  });
  if (neighbor) {
    await prisma.$transaction([
      prisma.programTrack.update({ where: { id: trackId }, data: { position: neighbor.position } }),
      prisma.programTrack.update({ where: { id: neighbor.id }, data: { position: track.position } }),
    ]);
  }
  revalidatePath(`/admin/programs/${track.programId}`);
  return { status: "success", message: "" };
}
