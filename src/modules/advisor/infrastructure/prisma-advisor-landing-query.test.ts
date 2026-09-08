import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  advisorProgramHref,
  findAdvisorLandingPath,
  hasAdvisorProjectAssignments,
} from "@/modules/advisor/infrastructure/prisma-advisor-landing-query";

function clientWith(assignedCount: number, programId: string | null) {
  const count = vi.fn().mockResolvedValue(assignedCount);
  const findFirst = vi.fn().mockResolvedValue(programId ? { programId } : null);
  return {
    client: {
      projectAdvisor: { count },
      programAdvisorInvitation: { findFirst },
    } as unknown as PrismaClient,
    count,
    findFirst,
  };
}

describe("findAdvisorLandingPath", () => {
  it("담당 프로젝트 배정이 있으면 담당 목록으로 보낸다", async () => {
    const { client } = clientWith(2, "program-1");

    await expect(findAdvisorLandingPath(client, "advisor-1")).resolves.toBe("/advisor");
  });

  it("배정이 없으면 불려 온 프로그램 심사 화면으로 보낸다", async () => {
    // 프로그램 초대만 받은 위원의 담당 목록은 언제나 비어 있어 첫 화면으로 쓸 수 없다.
    const { client, findFirst } = clientWith(0, "program-1");

    await expect(findAdvisorLandingPath(client, "advisor-1")).resolves.toBe("/topics?programId=program-1");
    // 회수된 초대를 되살려 남의 프로그램을 열어 주면 안 된다.
    expect(findFirst.mock.calls[0][0].where).toEqual({ userId: "advisor-1", revokedAt: null });
  });

  it("초대가 여러 개면 가장 최근 초대를 고른다", async () => {
    const { client, findFirst } = clientWith(0, "program-2");

    await expect(findAdvisorLandingPath(client, "advisor-1")).resolves.toBe("/topics?programId=program-2");
    expect(findFirst.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  it("배정도 초대도 없으면 목록 화면이 스스로 빈 상태를 세우게 둔다", async () => {
    const { client } = clientWith(0, null);

    await expect(findAdvisorLandingPath(client, "advisor-1")).resolves.toBe("/topics");
  });
});

describe("hasAdvisorProjectAssignments", () => {
  it("배정 수가 0이면 거짓이다", async () => {
    const { client, count } = clientWith(0, null);

    await expect(hasAdvisorProjectAssignments(client, "advisor-1")).resolves.toBe(false);
    expect(count).toHaveBeenCalledWith({ where: { userId: "advisor-1" } });
  });

  it("배정이 하나라도 있으면 참이다", async () => {
    const { client } = clientWith(1, null);

    await expect(hasAdvisorProjectAssignments(client, "advisor-1")).resolves.toBe(true);
  });
});

describe("advisorProgramHref", () => {
  it("주소에 들어갈 수 없는 문자를 흘려보내지 않는다", () => {
    expect(advisorProgramHref("a b&c")).toBe("/topics?programId=a%20b%26c");
  });
});
