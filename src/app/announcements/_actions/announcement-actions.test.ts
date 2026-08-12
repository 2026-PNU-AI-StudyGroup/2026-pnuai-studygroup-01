import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  audience: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: mocks.actor,
}));
vi.mock("@/app/announcements/_lib/announcement-audience", () => ({
  resolveAnnouncementAudience: mocks.audience,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/announcement/infrastructure/prisma-announcement-repository", () => ({
  PrismaAnnouncementRepository: class {
    create = mocks.create;
    update = mocks.update;
    delete = mocks.delete;
  },
}));

import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";

const actor = { id: "10000000-0000-4000-8000-000000000001", role: "PROFESSOR" as const };
const noticeId = "a2000000-0000-4000-8000-000000000001";
const programId = "40000000-0000-4000-8000-000000000001";

function validForm(target = `program:${programId}`) {
  const formData = new FormData();
  formData.set("title", "운영 일정 안내");
  formData.set("content", "공지 본문입니다.");
  formData.set("category", "GRADUATION_PROJECT");
  formData.set("visibility", "AUTHENTICATED");
  formData.set("target", target);
  return formData;
}

describe("공지 서버 액션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue(actor);
    mocks.audience.mockResolvedValue({
      role: actor.role,
      actorId: actor.id,
      teamIds: [],
      programIds: [programId],
    });
    mocks.create.mockResolvedValue({ id: noticeId });
    mocks.update.mockResolvedValue("UPDATED");
    mocks.delete.mockResolvedValue("DELETED");
  });

  it("소관이 아닌 프로그램으로 조작한 요청은 저장하지 않는다", async () => {
    const otherProgramId = "40000000-0000-4000-8000-000000000009";

    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      validForm(`program:${otherProgramId}`),
    )).resolves.toMatchObject({ status: "error" });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("생성 성공 후 공지 목록과 프로그램 화면을 재검증한다", async () => {
    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      validForm(),
    )).rejects.toThrow(`REDIRECT:/announcements/${noticeId}`);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/announcements");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/topics");
  });

  it("수정·삭제 성공 후 프로그램 화면을 재검증한다", async () => {
    await expect(updateAnnouncementAction(
      noticeId,
      { status: "idle", message: "" },
      validForm(),
    )).rejects.toThrow(`REDIRECT:/announcements/${noticeId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/topics");

    mocks.revalidatePath.mockClear();
    await expect(deleteAnnouncementAction(
      noticeId,
      { status: "idle", message: "" },
      new FormData(),
    )).rejects.toThrow("REDIRECT:/announcements");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/topics");
  });
});
