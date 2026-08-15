import { describe, expect, it, vi } from "vitest";

import { ListReceivedTopicApplicationsService } from "@/modules/topic-application/application/list-received-topic-applications";
import type { ProfessorTopicApplicationLister } from "@/modules/topic-application/application/topic-application-ports";

const actor = {
  id: "professor-1",
  name: "김교수",
  email: "professor@pusan.ac.kr",
  image: null,
  role: "PROFESSOR" as const,
};

function repository(listForActor: ProfessorTopicApplicationLister["listForActor"]): ProfessorTopicApplicationLister {
  return {
    listForActor,
    listAll: vi.fn(),
    listByTopicManager: vi.fn(),
  };
}

describe("ListReceivedTopicApplicationsService", () => {
  it("페이지 크기와 검색어를 제한하고 권한 주체를 저장소에 그대로 전달한다", async () => {
    const listForActor = vi.fn(async () => ({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      counts: { PENDING: 0, ACCEPTED: 0, REJECTED: 0, WITHDRAWN: 0 },
    }));

    await new ListReceivedTopicApplicationsService(repository(listForActor)).execute(
      actor,
      -3,
      100,
      "PENDING",
      `  ${"가".repeat(120)}  `,
    );

    expect(listForActor).toHaveBeenCalledWith(actor, {
      page: 1,
      pageSize: 50,
      status: "PENDING",
      query: "가".repeat(100),
    });
  });
});
