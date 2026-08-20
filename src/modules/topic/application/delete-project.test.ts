import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DeleteProjectError,
  DeleteProjectService,
  type ProjectDeletionWriter,
} from "@/modules/topic/application/delete-project";

const admin = { id: "admin-1", role: "ADMIN" as const, name: "관리자", email: "admin@pusan.ac.kr" };
const now = new Date("2026-08-20T00:00:00Z");

function writer(title: string | null = "테스트 프로젝트") {
  return {
    findTitle: vi.fn(async () => title),
    delete: vi.fn(async () => "DELETED" as const),
  } satisfies ProjectDeletionWriter;
}

function service(port: ProjectDeletionWriter) {
  return new DeleteProjectService(port, () => now);
}

describe("DeleteProjectService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("관리자가 이름과 사유를 맞게 주면 삭제한다", async () => {
    const port = writer();

    await service(port).execute(admin, {
      projectId: "topic-1",
      reason: "  테스트 정리  ",
      confirmedTitle: " 테스트 프로젝트 ",
    });

    expect(port.delete).toHaveBeenCalledWith({
      projectId: "topic-1",
      actorId: "admin-1",
      reason: "테스트 정리",
      deletedAt: now,
    });
  });

  it("관리자가 아니면 삭제하지 않는다", async () => {
    const port = writer();

    await expect(service(port).execute(
      { ...admin, role: "PROFESSOR" },
      { projectId: "topic-1", reason: "정리", confirmedTitle: "테스트 프로젝트" },
    )).rejects.toBeInstanceOf(DeleteProjectError);
    expect(port.delete).not.toHaveBeenCalled();
  });

  it("사유가 비면 삭제하지 않는다", async () => {
    const port = writer();

    await expect(service(port).execute(admin, {
      projectId: "topic-1",
      reason: "   ",
      confirmedTitle: "테스트 프로젝트",
    })).rejects.toBeInstanceOf(DeleteProjectError);
    expect(port.delete).not.toHaveBeenCalled();
  });

  it("프로젝트명이 다르면 삭제하지 않는다", async () => {
    // 되돌릴 수 없는 작업이라 이름 입력이 유일한 실수 방지 장치다.
    const port = writer();

    await expect(service(port).execute(admin, {
      projectId: "topic-1",
      reason: "정리",
      confirmedTitle: "다른 프로젝트",
    })).rejects.toBeInstanceOf(DeleteProjectError);
    expect(port.delete).not.toHaveBeenCalled();
  });

  it("없는 프로젝트는 조회 단계에서 멈춘다", async () => {
    const port = writer(null);

    await expect(service(port).execute(admin, {
      projectId: "gone",
      reason: "정리",
      confirmedTitle: "무엇이든",
    })).rejects.toBeInstanceOf(DeleteProjectError);
    expect(port.delete).not.toHaveBeenCalled();
  });
});
