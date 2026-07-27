import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, getCurrentActor, redirect } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getCurrentActor: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { findUnique } },
}));

import {
  getCurrentOperationalActor,
} from "@/modules/identity/infrastructure/operational-actor";
import { requireCompletedStudentOnboarding } from "@/modules/identity/infrastructure/student-onboarding-guard";

const student = {
  id: "student-1",
  role: "STUDENT" as const,
  name: "김학생",
  email: "student@pusan.ac.kr",
  image: null,
};

describe("운영 기능 사용자 온보딩 검사", () => {
  beforeEach(() => {
    findUnique.mockReset();
    getCurrentActor.mockReset();
    redirect.mockClear();
  });

  it("가입 정보가 필요한 학생의 운영 기능 사용을 온보딩으로 보낸다", async () => {
    findUnique.mockResolvedValue({
      onboardingRequired: true,
      onboardingCompletedAt: null,
    });

    await expect(requireCompletedStudentOnboarding(student)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("가입을 완료한 학생은 운영 기능을 사용할 수 있다", async () => {
    findUnique.mockResolvedValue({
      onboardingRequired: true,
      onboardingCompletedAt: new Date(),
    });
    getCurrentActor.mockResolvedValue(student);

    await expect(getCurrentOperationalActor()).resolves.toEqual(student);
  });

  it("교수와 관리자는 학생 온보딩 검사를 받지 않는다", async () => {
    const professor = { ...student, id: "professor-1", role: "PROFESSOR" as const };

    await expect(requireCompletedStudentOnboarding(professor)).resolves.toEqual(professor);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
