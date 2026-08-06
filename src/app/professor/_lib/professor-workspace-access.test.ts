import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentActorMock,
  redirectMock,
  topicFindFirstMock,
} = vi.hoisted(() => ({
  getCurrentActorMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
  topicFindFirstMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: getCurrentActorMock,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    topic: { findFirst: topicFindFirstMock },
  },
}));

import { requireProfessorWorkspaceActor } from "@/app/professor/_lib/professor-workspace-access";

describe("교수 워크스페이스 진입 가드", () => {
  beforeEach(() => {
    getCurrentActorMock.mockReset();
    redirectMock.mockClear();
    topicFindFirstMock.mockReset();
  });

  it("로그인하지 않은 사용자를 로그인 화면으로 보낸다", async () => {
    getCurrentActorMock.mockResolvedValue(null);

    await expect(requireProfessorWorkspaceActor()).rejects.toThrow(
      "redirect:/sign-in",
    );
    expect(topicFindFirstMock).not.toHaveBeenCalled();
  });

  it("프로젝트 조교 관계가 없는 학생을 대시보드로 보낸다", async () => {
    getCurrentActorMock.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      name: "학생",
      email: "student@example.com",
      image: null,
    });
    topicFindFirstMock.mockResolvedValue(null);

    await expect(requireProfessorWorkspaceActor()).rejects.toThrow(
      "redirect:/dashboard",
    );
    expect(topicFindFirstMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { assistants: { some: { userId: "student-1" } } },
        ],
      },
      select: { id: true },
    });
  });

  it("수락된 프로젝트 조교 학생의 읽기 진입을 유지한다", async () => {
    const actor = {
      id: "assistant-1",
      role: "STUDENT",
      name: "학생 조교",
      email: "assistant@example.com",
      image: null,
    } as const;
    getCurrentActorMock.mockResolvedValue(actor);
    topicFindFirstMock.mockResolvedValue({ id: "topic-1" });

    await expect(requireProfessorWorkspaceActor()).resolves.toBe(actor);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it.each(["PROFESSOR", "ADMIN"] as const)(
    "%s는 프로젝트 배정 조회 없이 진입한다",
    async (role) => {
      const actor = {
        id: `${role.toLowerCase()}-1`,
        role,
        name: role,
        email: `${role.toLowerCase()}@example.com`,
        image: null,
      } as const;
      getCurrentActorMock.mockResolvedValue(actor);

      await expect(requireProfessorWorkspaceActor()).resolves.toBe(actor);
      expect(topicFindFirstMock).not.toHaveBeenCalled();
    },
  );
});
