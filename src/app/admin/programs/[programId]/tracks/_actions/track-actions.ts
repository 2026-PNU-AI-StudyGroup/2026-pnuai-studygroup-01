"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProgramDivisionService } from "@/modules/program-division/application/manage-program-divisions";
import { PrismaProgramDivisionRepository } from "@/modules/program-division/infrastructure/prisma-program-division-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TrackActionState = { status: "idle" | "error" | "success" | "confirm"; message: string; projectCount?: number; voteCount?: number; switchesVotingScope?: boolean };
export const trackInitialState: TrackActionState = { status: "idle", message: "" };
const service = () => new ProgramDivisionService(new PrismaProgramDivisionRepository(prisma));
async function actor() { const value = await getCurrentActor(); if (!value) redirect("/sign-in"); return value; }
function refresh(programId: string) { revalidatePath(`/admin/programs/${programId}`); revalidatePath("/topics"); revalidatePath("/projects/new"); revalidatePath("/professor/topics/new"); }
const confirmedImpactSchema = z.object({
  expectedProjectCount: z.coerce.number().int().min(0),
  expectedVoteCount: z.coerce.number().int().min(0),
  expectedSwitchesVotingScope: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function createTrackAction(programId: string, _previous: TrackActionState, formData: FormData): Promise<TrackActionState> {
  if (!z.string().uuid().safeParse(programId).success) return { status: "error", message: "프로그램을 찾을 수 없습니다." };
  try { const outcome = await service().create(await actor(), programId, String(formData.get("name") ?? "")); if (outcome === "DUPLICATE") return { status: "error", message: "이미 있는 분과 이름입니다." }; if (outcome === "NOT_FOUND") return { status: "error", message: "프로그램을 찾을 수 없습니다." }; refresh(programId); return { status: "success", message: "분과를 추가했습니다." }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "분과를 추가할 수 없습니다." }; }
}
export async function renameTrackAction(trackId: string, programId: string, _previous: TrackActionState, formData: FormData): Promise<TrackActionState> {
  try { const outcome = await service().rename(await actor(), trackId, String(formData.get("name") ?? "")); if (outcome === "DUPLICATE") return { status: "error", message: "이미 있는 분과 이름입니다." }; if (outcome === "NOT_FOUND") return { status: "error", message: "분과를 찾을 수 없습니다." }; refresh(programId); return { status: "success", message: "분과 이름을 변경했습니다." }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "분과 이름을 변경할 수 없습니다." }; }
}
export async function moveTrackAction(trackId: string, programId: string, direction: "up" | "down", _previous: TrackActionState): Promise<TrackActionState> {
  void _previous;
  try { const ok = await service().move(await actor(), trackId, direction); if (!ok) return { status: "error", message: "분과를 찾을 수 없습니다." }; refresh(programId); return { status: "success", message: "순서를 변경했습니다." }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "순서를 변경할 수 없습니다." }; }
}
export async function deleteTrackAction(trackId: string, _previous: TrackActionState, formData: FormData): Promise<TrackActionState> {
  try { const currentActor = await actor(); const confirmed = formData.get("confirmed") === "true"; const programId = String(formData.get("programId") ?? ""); const parsedImpact = confirmedImpactSchema.safeParse(Object.fromEntries(formData)); const outcome = await service().delete(currentActor, trackId, confirmed, parsedImpact.success ? { projectCount: parsedImpact.data.expectedProjectCount, voteCount: parsedImpact.data.expectedVoteCount, switchesVotingScope: parsedImpact.data.expectedSwitchesVotingScope } : undefined); if (outcome === "SCORED_RUBRIC") return { status: "error", message: "이 분과 팀에 저장된 평가 점수가 있어 분과를 삭제할 수 없습니다." }; if (outcome === "PROGRAM_CLOSED") return { status: "error", message: "운영 종료된 프로그램의 분과는 삭제할 수 없습니다." }; if (outcome === "CONFIRMATION_REQUIRED") { const impact = await service().impact(currentActor, trackId); if (!impact) return { status: "error", message: "분과를 찾을 수 없습니다." }; return { status: "confirm", message: "연결 프로젝트는 미분과로 이동하고 이 프로그램의 표는 초기화됩니다.", ...impact }; } if (outcome === "NOT_FOUND") return { status: "error", message: "분과를 찾을 수 없습니다." }; refresh(programId); return { status: "success", message: "분과를 삭제했습니다." }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "분과를 삭제할 수 없습니다." }; }
}
