import { describe, expect, it, vi } from "vitest";

import {
  PendingProjectGuidanceRequestExistsError,
  ProjectGuidanceRequestNotAllowedError,
  ProjectGuidanceRequestNotFoundError,
  ProjectGuidanceRequestQueryService,
  ProjectGuidanceRequestService,
} from "@/modules/project-guidance-request/application/manage-project-guidance-requests";
import type {
  ProjectGuidanceRequestReader,
  ProjectGuidanceRequestWriter,
} from "@/modules/project-guidance-request/application/project-guidance-request-ports";

const actor = { id: "student-1", role: "STUDENT" as const };
const now = new Date("2026-08-03T00:00:00Z");

function writer(): ProjectGuidanceRequestWriter {
  return {
    create: vi.fn(async () => "CREATED" as const),
    respond: vi.fn(async () => true),
    cancel: vi.fn(async () => true),
  };
}

describe("프로젝트 지도 요청 서비스", () => {
  it("요청을 정규화해 저장 포트로 전달한다", async () => {
    const dependency = writer();
    await new ProjectGuidanceRequestService(dependency).create(actor, {
      teamId: "team-1",
      kind: "REVIEW",
      title: "  설계 검토  ",
      content: "  도메인 경계를 검토해 주세요.  ",
      referenceUrl: "",
    }, now);
    expect(dependency.create).toHaveBeenCalledWith({
      teamId: "team-1",
      actor,
      kind: "REVIEW",
      title: "설계 검토",
      content: "도메인 경계를 검토해 주세요.",
      referenceUrl: null,
      preferredAt: null,
      requestedAt: now,
    });
  });

  it("같은 유형의 대기 요청 중복을 명시적 오류로 변환한다", async () => {
    const dependency = writer();
    vi.mocked(dependency.create).mockResolvedValue("PENDING_EXISTS");
    await expect(new ProjectGuidanceRequestService(dependency).create(actor, {
      teamId: "team-1",
      kind: "REVIEW",
      title: "설계 검토",
      content: "도메인 경계를 검토해 주세요.",
    }, now)).rejects.toBeInstanceOf(PendingProjectGuidanceRequestExistsError);
  });

  it("권한 또는 상태 경계에서 거부된 응답과 취소를 오류로 변환한다", async () => {
    const dependency = writer();
    vi.mocked(dependency.respond).mockResolvedValue(false);
    vi.mocked(dependency.cancel).mockResolvedValue(false);
    const service = new ProjectGuidanceRequestService(dependency);
    await expect(service.respond(actor, { requestId: "request-1", response: "확인했습니다." }, now))
      .rejects.toBeInstanceOf(ProjectGuidanceRequestNotAllowedError);
    await expect(service.cancel(actor, "request-1", now))
      .rejects.toBeInstanceOf(ProjectGuidanceRequestNotAllowedError);
  });

  it("페이지 번호를 정규화하고 20개 단위로 조회한다", async () => {
    const reader: ProjectGuidanceRequestReader = {
      findPage: vi.fn(async () => ({ items: [], page: 1, totalPages: 1, total: 0, pendingTotal: 0 })),
    };
    await new ProjectGuidanceRequestQueryService(reader).list(actor, "team-1", -1);
    expect(reader.findPage).toHaveBeenCalledWith("team-1", actor, 1, 20);
  });

  it("볼 수 없는 팀의 요청 목록을 찾을 수 없음으로 처리한다", async () => {
    const reader: ProjectGuidanceRequestReader = { findPage: vi.fn(async () => null) };
    await expect(new ProjectGuidanceRequestQueryService(reader).list(actor, "team-1"))
      .rejects.toBeInstanceOf(ProjectGuidanceRequestNotFoundError);
  });
});
