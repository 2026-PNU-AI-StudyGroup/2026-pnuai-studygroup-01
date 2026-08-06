import { describe, expect, it, vi } from "vitest";

import { PrismaProfileImageRepository } from "@/modules/identity/infrastructure/prisma-profile-image-repository";

const image = {
  userId: "student-2",
  objectKey: "profile-images/student-2/upload-1",
  contentType: "image/png",
  size: 100,
  sha256: "a".repeat(64),
  updatedAt: new Date("2026-08-07T00:00:00Z"),
};

describe("PrismaProfileImageRepository", () => {
  it("본인과 관리자 조회는 사용자 ID로만 사진을 찾는다", async () => {
    const findUnique = vi.fn().mockResolvedValue(image);
    const findFirst = vi.fn();
    const repository = new PrismaProfileImageRepository({ userProfileImage: { findUnique, findFirst } } as never);

    await expect(repository.findVisibleForActor("student-2", { id: "admin-1", role: "ADMIN" })).resolves.toEqual(image);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "student-2" } }));
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("다른 사용자의 사진은 같은 프로젝트의 팀원, 지도교수 또는 조교인 경우만 찾는다", async () => {
    const findFirst = vi.fn().mockResolvedValue(image);
    const repository = new PrismaProfileImageRepository({
      userProfileImage: { findFirst, findUnique: vi.fn() },
    } as never);

    await expect(repository.findVisibleForActor("student-2", { id: "student-1", role: "STUDENT" })).resolves.toEqual(image);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: "student-2",
        user: {
          OR: expect.arrayContaining([
            { teamMemberships: { some: expect.objectContaining({ team: expect.any(Object) }) } },
            { topicsManaged: { some: { team: { is: expect.any(Object) } } } },
            { projectAssistantMemberships: { some: { topic: { team: { is: expect.any(Object) } } } } },
          ]),
        },
      }),
    }));
  });
});
