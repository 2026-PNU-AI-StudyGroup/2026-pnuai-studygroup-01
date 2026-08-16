import { describe, expect, it, vi } from "vitest";

import {
  ProgramReportDefinitionService,
  type ProgramReportDefinitionWriter,
} from "@/modules/report/application/manage-program-report-definitions";

const actor = { id: "admin-1", role: "ADMIN" as const };
const now = new Date("2026-08-16T00:00:00Z");
const input = { title: "  결과 보고서  ", dueAt: new Date("2026-09-01T00:00:00Z") };

function writer() {
  return {
    create: vi.fn(async () => "CREATED" as const),
    update: vi.fn(async () => "UPDATED" as const),
    move: vi.fn(async () => "UPDATED" as const),
    delete: vi.fn(async () => "DELETED" as const),
  } satisfies ProgramReportDefinitionWriter;
}

describe("프로그램 보고서 정의 관리", () => {
  it("수정·정렬·삭제에 프로그램 소속을 함께 전달한다", async () => {
    const repository = writer();
    const service = new ProgramReportDefinitionService(repository);

    await service.update(actor, "program-1", "definition-1", input, now);
    await service.move(actor, "program-1", "definition-1", "down");
    await service.delete(actor, "program-1", "definition-1", now);

    expect(repository.update).toHaveBeenCalledWith({
      programId: "program-1",
      definitionId: "definition-1",
      actorId: actor.id,
      title: "결과 보고서",
      dueAt: input.dueAt,
      required: true,
      now,
    });
    expect(repository.move).toHaveBeenCalledWith({ programId: "program-1", definitionId: "definition-1", direction: "down", actorId: actor.id });
    expect(repository.delete).toHaveBeenCalledWith({ programId: "program-1", definitionId: "definition-1", actorId: actor.id, now });
  });
});
