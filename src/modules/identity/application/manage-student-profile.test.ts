import { describe, expect, it, vi } from "vitest";

import { StudentProfileForbiddenError, StudentProfileService, type StudentProfileRepository } from "./manage-student-profile";

const profile = { phone: "010-1234-5678", kakao: "pnu_id", github: "https://github.com/pnu", instagram: "https://instagram.com/pnu" };

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
