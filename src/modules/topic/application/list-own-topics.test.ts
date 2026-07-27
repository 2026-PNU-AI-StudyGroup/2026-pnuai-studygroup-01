import { describe, expect, it, vi } from "vitest";

import {
  ListOwnTopicsService,
} from "@/modules/topic/application/list-own-topics";
import type { TopicLister } from "@/modules/topic/application/topic-ports";

describe("내 주제 조회", () => {
  it("현재 사용자의 프로젝트 감독 관계로 조회한다", async () => {
    const repository: TopicLister = { listByManager: vi.fn(async () => []), listAll: vi.fn(async () => []), listForActor: vi.fn(async () => []) };
    const service = new ListOwnTopicsService(repository);

    await service.execute({ id: "professor-1", role: "PROFESSOR" });

    expect(repository.listForActor).toHaveBeenCalledWith({ id: "professor-1", role: "PROFESSOR" });
  });

  it("학생 조교도 프로젝트 감독 관계를 조회할 수 있다", async () => {
    const repository: TopicLister = { listByManager: vi.fn(async () => []), listAll: vi.fn(async () => []), listForActor: vi.fn(async () => []) };
    const service = new ListOwnTopicsService(repository);

    await service.execute({ id: "student-1", role: "STUDENT" });
    expect(repository.listForActor).toHaveBeenCalledWith({ id: "student-1", role: "STUDENT" });
  });

  it("관리자도 동일한 저장소 경계로 전체 주제를 조회한다", async () => {
    const repository: TopicLister = { listByManager: vi.fn(async () => []), listAll: vi.fn(async () => []), listForActor: vi.fn(async () => []) };
    await new ListOwnTopicsService(repository).execute({ id: "admin-1", role: "ADMIN" });
    expect(repository.listForActor).toHaveBeenCalledWith({ id: "admin-1", role: "ADMIN" });
  });
});
