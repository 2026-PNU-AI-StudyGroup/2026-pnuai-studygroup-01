import { describe, expect, it, vi } from "vitest";

import {
  StudentNumberAlreadyUsedError,
  StudentOnboardingForbiddenError,
  StudentOnboardingService,
  type StudentOnboardingRepository,
} from "@/modules/identity/application/complete-student-onboarding";

const profile = {
  name: "김학생",
  department: "정보컴퓨터공학부",
  studentNumber: "202612345",
  grade: 2,
  phoneNumber: "01012345678",
  contactEmail: "student@example.com",
};

describe("신규 학생 가입 완료", () => {
  it("필수 정보를 정규화해 완료 시각과 함께 저장한다", async () => {
    const complete = vi.fn<StudentOnboardingRepository["complete"]>(async () => "COMPLETED");
    const completedAt = new Date("2026-07-26T10:00:00Z");

    await new StudentOnboardingService({ complete }).complete(
      { id: "student-1", role: "STUDENT" },
      { ...profile, phoneNumber: "010-1234-5678" },
      completedAt,
    );

    expect(complete).toHaveBeenCalledWith(
      "student-1",
      profile,
      completedAt,
    );
  });

  it("교수 계정은 학생 가입 정보를 저장할 수 없다", async () => {
    const complete = vi.fn<StudentOnboardingRepository["complete"]>();
    await expect(
      new StudentOnboardingService({ complete }).complete(
        { id: "professor-1", role: "PROFESSOR" },
        profile,
      ),
    ).rejects.toBeInstanceOf(StudentOnboardingForbiddenError);
  });

  it("이미 등록된 학번을 구분해 알린다", async () => {
    const complete = vi.fn<StudentOnboardingRepository["complete"]>(async () => "STUDENT_NUMBER_TAKEN");
    await expect(
      new StudentOnboardingService({ complete }).complete(
        { id: "student-1", role: "STUDENT" },
        profile,
      ),
    ).rejects.toBeInstanceOf(StudentNumberAlreadyUsedError);
  });
});
