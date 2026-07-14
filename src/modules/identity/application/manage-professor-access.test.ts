import { describe, expect, it, vi } from "vitest";

import {
  InvalidProfessorEmailError,
  ProfessorAccessForbiddenError,
  ProfessorAccessNotFoundError,
  ProfessorAccessService,
  type ProfessorAccessRepository,
} from "@/modules/identity/application/manage-professor-access";

function repository(overrides: Partial<ProfessorAccessRepository> = {}): ProfessorAccessRepository {
  return {
    list: vi.fn(async () => []),
    grant: vi.fn(async () => undefined),
    revoke: vi.fn(async () => true),
    ...overrides,
  };
}

describe("교수 권한 관리", () => {
  it("관리자가 정규화된 부산대학교 이메일을 허용한다", async () => {
    const target = repository();
    await new ProfessorAccessService(target).grant(
      { id: "admin", role: "ADMIN" },
      " Professor@PUSAN.AC.KR ",
    );
    expect(target.grant).toHaveBeenCalledWith("professor@pusan.ac.kr", "admin");
  });

  it("외부 이메일과 비관리자 요청을 저장 전에 거부한다", async () => {
    const target = repository();
    const service = new ProfessorAccessService(target);
    await expect(service.grant({ id: "admin", role: "ADMIN" }, "user@gmail.com"))
      .rejects.toBeInstanceOf(InvalidProfessorEmailError);
    await expect(service.grant({ id: "professor", role: "PROFESSOR" }, "p@pusan.ac.kr"))
      .rejects.toBeInstanceOf(ProfessorAccessForbiddenError);
    expect(target.grant).not.toHaveBeenCalled();
  });

  it("활성 허용 항목이 없는 회수를 명시적으로 거부한다", async () => {
    const target = repository({ revoke: vi.fn(async () => false) });
    await expect(new ProfessorAccessService(target).revoke(
      { id: "admin", role: "ADMIN" },
      "professor@pusan.ac.kr",
    )).rejects.toBeInstanceOf(ProfessorAccessNotFoundError);
  });
});
