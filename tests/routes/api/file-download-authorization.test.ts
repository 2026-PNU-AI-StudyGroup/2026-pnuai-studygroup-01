import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  audience: vi.fn(),
  findFirst: vi.fn(),
  signedUrl: vi.fn(async () => "https://objects.example/download"),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: mocks.actor }));
vi.mock("@/modules/announcement/infrastructure/announcement-audience", () => ({ resolveAnnouncementAudience: mocks.audience }));
vi.mock("@/modules/announcement/infrastructure/prisma-announcement-repository", () => ({
  announcementScopeWhere: vi.fn(() => ({ OR: [{ visibility: "AUTHENTICATED" }] })),
}));
vi.mock("@/modules/team/infrastructure/prisma-team-workspace-authorization", () => ({ teamActorWhere: vi.fn(() => ({ id: "team-1" })) }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: { storedFile: { findFirst: mocks.findFirst } } }));
vi.mock("@/shared/infrastructure/object-storage/s3", () => ({ objectStorageBucket: "bucket", s3: {} }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.signedUrl }));

import { GET } from "@/app/api/files/[fileId]/route";

describe("파일 다운로드 권한", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.audience.mockResolvedValue({ role: "STUDENT", actorId: "student-1", teamIds: [], programIds: [] });
  });

  it("공지 첨부 조회에 공지 열람 범위를 적용하고 다운로드로 응답한다", async () => {
    mocks.findFirst.mockResolvedValue({ objectKey: "announcements/file", originalName: "자료.any" });
    const response = await GET(new Request("http://localhost/api/files/file-1"), { params: Promise.resolve({ fileId: "file-1" }) });

    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "ATTACHED",
        OR: expect.arrayContaining([
          { projectTeam: { id: "team-1" } },
          expect.objectContaining({
            purpose: "ARTIFACT",
            projectTeam: expect.objectContaining({
              confirmedAt: { not: null },
              project: { program: expect.objectContaining({ isStudentPublic: true }) },
            }),
          }),
          { announcementAttachment: { announcement: { OR: [{ visibility: "AUTHENTICATED" }] } } },
        ]),
      }),
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://objects.example/download");
  });

  it("열람 가능한 연결이 없으면 파일 존재를 숨긴다", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/files/file-1"), { params: Promise.resolve({ fileId: "file-1" }) });
    expect(response.status).toBe(404);
  });

  it("교수에게는 교수진 공개 프로그램의 종료 결과물을 허용한다", async () => {
    mocks.actor.mockResolvedValue({ id: "professor-1", role: "PROFESSOR" });
    mocks.audience.mockResolvedValue({ role: "PROFESSOR", actorId: "professor-1", teamIds: [], programIds: [] });
    mocks.findFirst.mockResolvedValue({ objectKey: "artifacts/file", originalName: "결과물.pdf" });

    await GET(new Request("http://localhost/api/files/file-1"), { params: Promise.resolve({ fileId: "file-1" }) });

    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            purpose: "ARTIFACT",
            projectTeam: expect.objectContaining({
              project: { program: expect.objectContaining({ isFacultyPublic: true }) },
            }),
          }),
        ]),
      }),
    }));
  });
});
