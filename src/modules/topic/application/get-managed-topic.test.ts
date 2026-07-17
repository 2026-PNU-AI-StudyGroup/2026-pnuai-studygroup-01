import { describe, expect, it, vi } from "vitest";

import { GetManagedTopicService, ManagedTopicNotFoundError } from "@/modules/topic/application/get-managed-topic";
import type { ManagedTopicReader } from "@/modules/topic/application/topic-ports";

describe("관리 주제 상세 조회", () => {
  it("현재 교수의 범위를 저장소 조회 조건에 전달한다", async () => {
    const reader: ManagedTopicReader = { findManaged: vi.fn(async () => ({ id: "topic-1" }) as never) };
    await new GetManagedTopicService(reader).execute({ id: "professor-1", role: "PROFESSOR" }, "topic-1");
    expect(reader.findManaged).toHaveBeenCalledWith("topic-1", { id: "professor-1", role: "PROFESSOR" });
  });

  it("학생과 보이지 않는 주제를 동일하게 숨긴다", async () => {
    const reader: ManagedTopicReader = { findManaged: vi.fn(async () => null) };
    await expect(new GetManagedTopicService(reader).execute({ id: "student-1", role: "STUDENT" }, "topic-1")).rejects.toBeInstanceOf(ManagedTopicNotFoundError);
    expect(reader.findManaged).not.toHaveBeenCalled();
  });
});
