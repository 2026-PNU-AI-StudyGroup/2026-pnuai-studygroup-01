import { describe, expect, it } from "vitest";

import { isOwnProject } from "@/modules/project-voting/domain/project-voting-policy";

const base = { authorId: "student-1", managerId: null as string | null, assistantCount: 0, memberCount: 0 };

describe("isOwnProject", () => {
  it("등록자 본인은 당사자다", () => {
    expect(isOwnProject(base, { id: "student-1", role: "STUDENT" })).toBe(true);
  });

  it("팀원과 조교는 당사자다", () => {
    expect(isOwnProject({ ...base, memberCount: 1 }, { id: "student-2", role: "STUDENT" })).toBe(true);
    expect(isOwnProject({ ...base, assistantCount: 1 }, { id: "prof-1", role: "PROFESSOR" })).toBe(true);
  });

  it("지도교수는 담당 프로젝트의 당사자다", () => {
    expect(isOwnProject({ ...base, managerId: "prof-1" }, { id: "prof-1", role: "PROFESSOR" })).toBe(true);
  });

  it("관리자는 담당자로 박혀 있어도 당사자가 아니다", () => {
    // 학생 등록 프로젝트를 관리자 경로로 승인하면 승인한 관리자가 managerId 로 박힌다.
    // 그걸 당사자로 보면 자기가 승인한 프로젝트 전부에 투표할 수 없게 된다.
    expect(isOwnProject({ ...base, managerId: "admin-1" }, { id: "admin-1", role: "ADMIN" })).toBe(false);
  });

  it("관리자라도 팀원이면 당사자다", () => {
    expect(isOwnProject({ ...base, managerId: "admin-1", memberCount: 1 }, { id: "admin-1", role: "ADMIN" })).toBe(true);
  });

  it("아무 관계도 없으면 당사자가 아니다", () => {
    expect(isOwnProject({ ...base, managerId: "prof-1" }, { id: "other-1", role: "STUDENT" })).toBe(false);
  });
});
