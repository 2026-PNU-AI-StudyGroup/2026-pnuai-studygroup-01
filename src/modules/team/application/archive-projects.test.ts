import { describe, expect, it, vi } from "vitest";

import {
  CloseTeamService,
  ListArchivedProjectsService,
  TeamCloseNotAllowedError,
  type TeamCloser,
} from "@/modules/team/application/archive-projects";

describe("팀 종료", () => {
  it("학생 요청은 저장소 호출 전에 거부한다", async () => {
    const closer: TeamCloser = { close: vi.fn(async () => true) };
    await expect(new CloseTeamService(closer).close(
      { id: "student", role: "STUDENT" },
      "team-1",
    )).rejects.toBeInstanceOf(TeamCloseNotAllowedError);
    expect(closer.close).not.toHaveBeenCalled();
  });

  it("승인 조건을 충족한 지도교수 요청을 완료한다", async () => {
    const closer: TeamCloser = { close: vi.fn(async () => true) };
    await expect(new CloseTeamService(closer).close(
      { id: "professor", role: "PROFESSOR" },
      "team-1",
    )).resolves.toBeUndefined();
  });
});

describe("아카이브 페이지", () => {
  it("페이지 번호를 offset과 제한으로 변환한다", async () => {
    const reader = {
      listAcademicYears: vi.fn(async () => [2026, 2025]),
      listProgramCategories: vi.fn(async () => ["캡스톤", "대회"]),
      countClosed: vi.fn(async () => 41),
      listClosed: vi.fn(async () => []),
      findClosed: vi.fn(async () => null),
    };
    const result = await new ListArchivedProjectsService(reader).execute(2, 20);
    expect(reader.listClosed).toHaveBeenCalledWith({ offset: 20, limit: 20, filters: {} });
    expect(result.totalPages).toBe(3);
    expect(result.academicYears).toEqual([2026, 2025]);
    expect(result.programCategories).toEqual(["캡스톤", "대회"]);
  });

  it("범위를 벗어나거나 안전하지 않은 페이지를 유효 범위로 제한한다", async () => {
    const reader = {
      listAcademicYears: vi.fn(async () => [2026]),
      listProgramCategories: vi.fn(async () => ["캡스톤"]),
      countClosed: vi.fn(async () => 41),
      listClosed: vi.fn(async () => []),
      findClosed: vi.fn(async () => null),
    };
    const service = new ListArchivedProjectsService(reader);
    await expect(service.execute(999, 20)).resolves.toMatchObject({ page: 3 });
    expect(reader.listClosed).toHaveBeenLastCalledWith({ offset: 40, limit: 20, filters: {} });
    await expect(service.execute(1e20, 20)).resolves.toMatchObject({ page: 1 });
    expect(reader.listClosed).toHaveBeenLastCalledWith({ offset: 0, limit: 20, filters: {} });
  });

  it("검색어와 학년도를 정규화해 개수와 목록에 동일하게 적용한다", async () => {
    const reader = { listAcademicYears: vi.fn(async () => [2026]), listProgramCategories: vi.fn(async () => ["캡스톤"]), countClosed: vi.fn(async () => 0), listClosed: vi.fn(async () => []), findClosed: vi.fn(async () => null) };
    await new ListArchivedProjectsService(reader).execute(1, 20, { query: "  TypeScript  ", academicYear: 2026, programCategory: "  캡스톤  " });
    expect(reader.countClosed).toHaveBeenCalledWith({ query: "TypeScript", academicYear: 2026, programCategory: "캡스톤" });
    expect(reader.listClosed).toHaveBeenCalledWith({ offset: 0, limit: 20, filters: { query: "TypeScript", academicYear: 2026, programCategory: "캡스톤" } });
  });

  it("지난 프로젝트 상세를 독립 식별자로 조회한다", async () => {
    const findClosed = vi.fn(async () => null);
    const reader = { listAcademicYears: vi.fn(), listProgramCategories: vi.fn(), countClosed: vi.fn(), listClosed: vi.fn(), findClosed };
    await new ListArchivedProjectsService(reader).find("team-1");
    expect(findClosed).toHaveBeenCalledWith("team-1");
  });
});
