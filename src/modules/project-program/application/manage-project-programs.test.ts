import { describe, expect, it, vi } from "vitest";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";

describe("프로젝트 프로그램 관리", () => {
  it("관리자가 특정 학기에 동적 프로그램을 개설한다", async () => {
    const repository = { create: vi.fn(async () => "CREATED" as const), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(), findOpen: vi.fn() };
    await new ProjectProgramService(repository).create({ id: "admin", role: "ADMIN" }, { academicCycleId: "cycle", name: " PNU 창의융합 해커톤 ", category: " 교내 대회 ", description: " 설명 ", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-08-01"), advisorEnabled: false, studentProjectCreationEnabled: true });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: "PNU 창의융합 해커톤", advisorEnabled: false, createdById: "admin" }));
  });
  it("교수의 프로그램 개설을 거부한다", async () => {
    const repository = { create: vi.fn(), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(), findOpen: vi.fn() };
    await expect(new ProjectProgramService(repository).create({ id: "professor", role: "PROFESSOR" }, { academicCycleId: "cycle", name: "대회", category: "대회", description: "설명", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-08-01"), advisorEnabled: true, studentProjectCreationEnabled: false })).rejects.toBeInstanceOf(InvalidProjectProgramError);
  });

  it("관리자가 프로그램의 학생 프로젝트 생성 허용 여부를 변경한다", async () => {
    const repository = { create: vi.fn(), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(async () => true), findOpen: vi.fn() };

    await new ProjectProgramService(repository).changeStudentProjectCreation({ id: "admin", role: "ADMIN" }, "program-1", true);

    expect(repository.changeStudentProjectCreation).toHaveBeenCalledWith("program-1", true);
  });
});
