import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type ProjectProgramDetails = {
  name: string;
  category: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  advisorEnabled: boolean;
  studentProjectCreationEnabled: boolean;
};

export class InvalidProjectProgramError extends Error {}

export function normalizeProjectProgram(input: ProjectProgramDetails): ProjectProgramDetails {
  const value = { ...input, name: input.name.trim(), category: input.category.trim(), description: input.description.trim() };
  if (!value.name || value.name.length > 200) throw new InvalidProjectProgramError("프로그램명은 1자 이상 200자 이하여야 합니다.");
  if (!value.category || value.category.length > 100) throw new InvalidProjectProgramError("분류는 1자 이상 100자 이하여야 합니다.");
  if (!value.description || value.description.length > 5000) throw new InvalidProjectProgramError("설명은 1자 이상 5000자 이하여야 합니다.");
  if (!Number.isFinite(value.startsAt.getTime()) || !Number.isFinite(value.endsAt.getTime()) || value.startsAt >= value.endsAt) throw new InvalidProjectProgramError("프로그램 시작 시각은 종료 시각보다 앞서야 합니다.");
  return value;
}

export function assertProgramAdmin(actor: CurrentActor) {
  if (actor.role !== "ADMIN") throw new InvalidProjectProgramError("관리자만 프로그램을 개설하고 상태를 변경할 수 있습니다.");
}
