import { describe, expect, it, vi } from "vitest";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";

describe("프로젝트 프로그램 관리", () => {
  it("관리자가 특정 학기에 동적 프로그램을 개설한다", async () => {
    const repository = { create: vi.fn(async () => "CREATED" as const), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), findOpen: vi.fn() };
    await new ProjectProgramService(repository).create({ id: "admin", role: "ADMIN" }, { academicCycleId: "cycle", name: " PNU 창의융합 해커톤 ", category: " 교내 대회 ", description: " 설명 ", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-08-01") });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: "PNU 창의융합 해커톤", createdById: "admin" }));
  });
  it("교수의 프로그램 개설을 거부한다", async () => {
    const repository = { create: vi.fn(), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), findOpen: vi.fn() };
    await expect(new ProjectProgramService(repository).create({ id: "professor", role: "PROFESSOR" }, { academicCycleId: "cycle", name: "대회", category: "대회", description: "설명", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-08-01") })).rejects.toBeInstanceOf(InvalidProjectProgramError);
  });
});
