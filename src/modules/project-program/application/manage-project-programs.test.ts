import { describe, expect, it, vi } from "vitest";
import { ProjectProgramOperationError, ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";

describe("프로젝트 프로그램 관리", () => {
  it("관리자가 운영 기간을 가진 동적 프로그램을 개설한다", async () => {
    const repository = { create: vi.fn(async () => "CREATED" as const), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(), findOpen: vi.fn() };
    await new ProjectProgramService(repository).create({ id: "admin", role: "ADMIN" }, { name: " PNU 창의융합 해커톤 ", category: " 교내 대회 ", description: " 설명 ", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-08-01"), advisorEnabled: false, studentProjectCreationEnabled: true });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: "PNU 창의융합 해커톤", advisorEnabled: false, createdById: "admin" }));
  });
  it("교수의 프로그램 개설을 거부한다", async () => {
    const repository = { create: vi.fn(), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(), findOpen: vi.fn() };
    await expect(new ProjectProgramService(repository).create({ id: "professor", role: "PROFESSOR" }, { name: "대회", category: "대회", description: "설명", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-08-01"), advisorEnabled: true, studentProjectCreationEnabled: false })).rejects.toBeInstanceOf(InvalidProjectProgramError);
  });

  it("같은 시작 시각의 동일한 프로그램명을 거부한다", async () => {
    const repository = { create: vi.fn(async () => "DUPLICATE" as const), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(), findOpen: vi.fn() };

    await expect(new ProjectProgramService(repository).create(
      { id: "admin", role: "ADMIN" },
      { name: "캡스톤", category: "교과", description: "설명", startsAt: new Date("2026-03-01T00:00:00Z"), endsAt: new Date("2026-12-01T00:00:00Z"), advisorEnabled: true, studentProjectCreationEnabled: false },
    )).rejects.toThrow(new ProjectProgramOperationError("같은 시작 시각에 동일한 프로그램명이 있습니다."));
  });

  it("운영 시작 연도를 서울 시간대로 계산한다", () => {
    expect(getProgramStartYear(new Date("2025-12-31T15:00:00.000Z"))).toBe(2026);
  });

  it("관리자가 프로그램의 학생 프로젝트 제안 허용 여부를 변경한다", async () => {
    const repository = { create: vi.fn(), listAll: vi.fn(), listOpen: vi.fn(), changeStatus: vi.fn(), changeStudentProjectCreation: vi.fn(async () => true), findOpen: vi.fn() };

    await new ProjectProgramService(repository).changeStudentProjectCreation({ id: "admin", role: "ADMIN" }, "program-1", true);

    expect(repository.changeStudentProjectCreation).toHaveBeenCalledWith("program-1", true);
  });
});
