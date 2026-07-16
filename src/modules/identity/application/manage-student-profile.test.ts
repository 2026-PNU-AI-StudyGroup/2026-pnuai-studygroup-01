import { describe, expect, it, vi } from "vitest";

import { StudentProfileForbiddenError, StudentProfileService, type StudentProfileRepository } from "./manage-student-profile";

const profile = { interests: ["접근성"], skills: ["TypeScript"], desiredRole: "프론트엔드", availability: "평일 저녁", bio: "사용자 검증 경험이 있습니다." };

function repository(): StudentProfileRepository {
  return { find: vi.fn(async () => profile), save: vi.fn(async () => undefined) };
}

describe("학생 프로젝트 프로필 관리", () => {
  it("학생 본인의 프로필을 저장한다", async () => {
    const target = repository();
    await new StudentProfileService(target).save({ id: "student-1", role: "STUDENT" }, profile);
    expect(target.save).toHaveBeenCalledWith("student-1", profile);
  });

  it("교수와 관리자의 학생 프로필 변경을 거부한다", async () => {
    await expect(new StudentProfileService(repository()).save({ id: "professor-1", role: "PROFESSOR" }, profile)).rejects.toBeInstanceOf(StudentProfileForbiddenError);
  });
});
