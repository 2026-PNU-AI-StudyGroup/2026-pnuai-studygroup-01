import { describe, expect, it, vi } from "vitest";

import {
  GetReceivedTopicApplicationService,
  ReceivedTopicApplicationNotFoundError,
  ReceivedTopicApplicationReadingForbiddenError,
} from "@/modules/topic-application/application/get-received-topic-application";
import type {
  ProfessorTopicApplicationReader,
  ProfessorTopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";

const application: ProfessorTopicApplicationSummary = {
  id: "application-1",
  topicId: "topic-1",
  topicTitle: "프로젝트 관리 시스템",
  topicAuthorId: "professor-1",
  studentId: "student-1",
  studentName: "김학생",
  studentEmail: "student@pusan.ac.kr",
  status: "PENDING",
  message: "지원합니다.",
  skills: ["Next.js"],
  desiredRole: "프론트엔드",
  availability: "평일 저녁",
  createdAt: new Date("2026-07-17T09:00:00+09:00"),
};

function reader(result: ProfessorTopicApplicationSummary | null): ProfessorTopicApplicationReader {
  return { findVisibleById: vi.fn(async () => result) };
}

describe("받은 지원서 상세 조회", () => {
  it("교수 식별자를 저장소 가시성 조건으로 전달한다", async () => {
    const repository = reader(application);

    await expect(
      new GetReceivedTopicApplicationService(repository).execute(
        { id: "professor-1", role: "PROFESSOR" },
        "application-1",
      ),
    ).resolves.toEqual(application);
    expect(repository.findVisibleById).toHaveBeenCalledWith("application-1", {
      actorId: "professor-1",
      isAdmin: false,
    });
  });

  it("다른 교수에게 보이지 않는 지원서는 찾을 수 없음으로 처리한다", async () => {
    const repository = reader(null);

    await expect(
      new GetReceivedTopicApplicationService(repository).execute(
        { id: "professor-2", role: "PROFESSOR" },
        "application-1",
      ),
    ).rejects.toBeInstanceOf(ReceivedTopicApplicationNotFoundError);
  });

  it("관리자에게 전체 지원서 조회 권한을 전달한다", async () => {
    const repository = reader(application);

    await new GetReceivedTopicApplicationService(repository).execute(
      { id: "admin-1", role: "ADMIN" },
      "application-1",
    );

    expect(repository.findVisibleById).toHaveBeenCalledWith("application-1", {
      actorId: "admin-1",
      isAdmin: true,
    });
  });

  it("학생의 교수 지원서 조회를 저장소 호출 전에 거절한다", async () => {
    const repository = reader(application);

    await expect(
      new GetReceivedTopicApplicationService(repository).execute(
        { id: "student-1", role: "STUDENT" },
        "application-1",
      ),
    ).rejects.toBeInstanceOf(ReceivedTopicApplicationReadingForbiddenError);
    expect(repository.findVisibleById).not.toHaveBeenCalled();
  });
});
