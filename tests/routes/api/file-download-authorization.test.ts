import { beforeEach, describe, expect, it, vi } from "vitest";

// 예전 이 테스트는 조회 조건의 "모양"만 확인했다. 그래서 관리자 조건이 빈 객체로 OR 가지에
// 들어가 조건 전체가 죽는 실제 결함을 잡지 못했다. 이제는 어떤 사유로 접근이 허용되는지를
// 조회 결과로 흉내 내어 응답 동작으로 확인한다.

type FileRow = { objectKey: string; originalName: string; contentType: string; size: number };

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  audience: vi.fn(),
  findFirst: vi.fn(),
  send: vi.fn(async () => ({
    Body: {
      transformToWebStream: () => new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
    },
  })),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: mocks.actor }));
vi.mock("@/modules/announcement/infrastructure/announcement-audience", () => ({ resolveAnnouncementAudience: mocks.audience }));
vi.mock("@/modules/announcement/infrastructure/prisma-announcement-repository", () => ({
  announcementScopeWhere: vi.fn(() => ({ OR: [{ visibility: "AUTHENTICATED" }] })),
}));
vi.mock("@/modules/advisor/infrastructure/advisor-file-access", () => ({
  teamFileAccessWhere: vi.fn((actor: { role: string }) => (actor.role === "ADMIN" ? {} : { id: "team-1" })),
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: { storedFile: { findFirst: mocks.findFirst } } }));
vi.mock("@/shared/infrastructure/object-storage/s3", () => ({ objectStorageBucket: "bucket", s3: { send: mocks.send } }));

import { GET } from "@/app/api/files/[fileId]/route";

const row: FileRow = { objectKey: "teams/file", originalName: "자료.any", contentType: "application/octet-stream", size: 3 };

/** 지정한 접근 사유의 조회만 파일을 돌려준다. 나머지 사유는 못 찾은 것으로 둔다. */
function allowOnly(match: (where: Record<string, unknown>) => boolean) {
  mocks.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => (match(where) ? row : null));
}

const request = () => GET(new Request("http://localhost/api/files/file-1"), { params: Promise.resolve({ fileId: "file-1" }) });

describe("파일 다운로드 권한", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.audience.mockResolvedValue({ role: "STUDENT", actorId: "student-1", teamIds: [], programIds: [] });
  });

  it("팀 소속으로 접근하면 앱이 본문을 직접 내려준다", async () => {
    allowOnly((where) => JSON.stringify(where.projectTeam) === JSON.stringify({ id: "team-1" }));
    const response = await request();

    // 내부 전용 스토리지 주소로 넘기지 않는다.
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-disposition")).toBe("attachment; filename*=UTF-8''%EC%9E%90%EB%A3%8C.any");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("공지 열람 범위로만 닿는 첨부도 내려준다", async () => {
    allowOnly((where) => Boolean(where.announcementAttachment));
    expect((await request()).status).toBe(200);
  });

  it("관리자는 진행 중 프로그램의 팀 파일도 받는다", async () => {
    mocks.actor.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.audience.mockResolvedValue({ role: "ADMIN", actorId: "admin-1", teamIds: [], programIds: [] });
    // 관리자는 팀 제한이 없어 조건이 비어 있고, 종료 프로그램 조건은 만족하지 못한다.
    allowOnly((where) => "projectTeam" in where && JSON.stringify(where.projectTeam) === "{}");

    expect((await request()).status).toBe(200);
  });

  it("교수는 공개된 종료 프로그램의 결과물을 받는다", async () => {
    mocks.actor.mockResolvedValue({ id: "professor-1", role: "PROFESSOR" });
    mocks.audience.mockResolvedValue({ role: "PROFESSOR", actorId: "professor-1", teamIds: [], programIds: [] });
    allowOnly((where) => {
      if (where.purpose !== "ARTIFACT") return false;
      const team = where.projectTeam as { project?: { program?: { isPublic?: boolean } } } | undefined;
      return team?.project?.program?.isPublic === true;
    });

    expect((await request()).status).toBe(200);
  });

  it("열람 가능한 연결이 없으면 파일 존재를 숨긴다", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
  });
});
