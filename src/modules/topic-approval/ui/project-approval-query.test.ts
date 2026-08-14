import { describe, expect, it } from "vitest";

import { parseTopicApprovalStatus, projectApprovalDetailHref, projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-query";

describe("project approval query", () => {
  it("프로그램·상태·페이지 문맥을 목록과 상세 주소에 유지한다", () => {
    const query = { programId: "program-1", status: "PENDING" as const, page: 3 };

    expect(projectApprovalsHref(query)).toBe("/project-approvals?programId=program-1&status=PENDING&page=3");
    expect(projectApprovalDetailHref("request-1", query)).toBe("/project-approvals/request-1?programId=program-1&status=PENDING&page=3");
  });

  it("첫 페이지와 잘못된 상태는 기본값으로 정규화한다", () => {
    expect(projectApprovalsHref({ page: 1 })).toBe("/project-approvals");
    expect(parseTopicApprovalStatus("UNKNOWN")).toBeUndefined();
    expect(parseTopicApprovalStatus("APPROVED")).toBe("APPROVED");
  });
});
