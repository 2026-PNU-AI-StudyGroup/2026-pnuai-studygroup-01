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
      privacyNoticeAckAt: new Date(),
      onboardingRequired: true,
      onboardingCompletedAt: null,
    });

    await expect(requireCompletedStudentOnboarding(student)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("가입을 완료한 학생은 운영 기능을 사용할 수 있다", async () => {
    findUnique.mockResolvedValue({
      privacyNoticeAckAt: new Date(),
      onboardingRequired: true,
      onboardingCompletedAt: new Date(),
    });
    getCurrentActor.mockResolvedValue(student);

    await expect(getCurrentOperationalActor()).resolves.toEqual(student);
  });

  it("교수와 관리자는 처리방침 고지만 확인하고 학생 가입 검사는 받지 않는다", async () => {
    const professor = { ...student, id: "professor-1", role: "PROFESSOR" as const };
    findUnique.mockResolvedValue({
      privacyNoticeAckAt: new Date(),
      onboardingRequired: true,
      onboardingCompletedAt: null,
    });

    await expect(requireCompletedStudentOnboarding(professor)).resolves.toEqual(professor);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("처리방침 고지를 확인하지 않았으면 역할과 무관하게 온보딩으로 보낸다", async () => {
    const admin = { ...student, id: "admin-1", role: "ADMIN" as const };
    findUnique.mockResolvedValue({
      privacyNoticeAckAt: null,
      onboardingRequired: false,
      onboardingCompletedAt: null,
    });

    await expect(requireCompletedStudentOnboarding(admin)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });
});
