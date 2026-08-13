import { describe, expect, it, vi } from "vitest";

import {
  AdminProjectCardDataForbiddenError,
  ListAdminProjectCardDataService,
  type AdminProjectCardDataReader,
} from "@/modules/team/application/list-admin-project-card-data";

describe("ListAdminProjectCardDataService", () => {
  it("관리자만 프로젝트 진행 현황과 연락처 데이터를 조회할 수 있다", async () => {
    const reader: AdminProjectCardDataReader = { listByTopicIds: vi.fn().mockResolvedValue([]) };
    const service = new ListAdminProjectCardDataService(reader);

    await expect(service.execute({ id: "student-1", role: "STUDENT" }, ["topic-1"]))
      .rejects.toBeInstanceOf(AdminProjectCardDataForbiddenError);
    expect(reader.listByTopicIds).not.toHaveBeenCalled();
  });

  it("관리자 조회에서는 중복 프로젝트 ID를 제거한다", async () => {
    const reader: AdminProjectCardDataReader = { listByTopicIds: vi.fn().mockResolvedValue([]) };
    const service = new ListAdminProjectCardDataService(reader);

    await service.execute({ id: "admin-1", role: "ADMIN" }, ["topic-1", "topic-1"]);

    expect(reader.listByTopicIds).toHaveBeenCalledWith(["topic-1"]);
  });
});
