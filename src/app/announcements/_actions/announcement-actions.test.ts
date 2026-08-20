import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  audience: vi.fn(),
  findById: vi.fn(),
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
    findById = mocks.findById;
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
const teamId = "30000000-0000-4000-8000-000000000001";
const uploadId = "50000000-0000-4000-8000-000000000001";

function validForm(target = `team:${teamId}`) {
  const formData = new FormData();
  formData.set("title", "운영 일정 안내");
  formData.set("content", "공지 본문입니다.");
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
      teamIds: [teamId],
      programIds: [programId],
    });
    mocks.findById.mockResolvedValue({ authorId: actor.id, teamId, programId: null });
    mocks.create.mockResolvedValue({ id: noticeId, teamId, programId: null });
    mocks.update.mockResolvedValue("UPDATED");
    mocks.delete.mockResolvedValue("DELETED");
  });

  it("대상 형식이 잘못되면 만들지 않는다", async () => {
    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      validForm("nonsense:1"),
    )).resolves.toMatchObject({ status: "error" });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("프로젝트 공지 생성 성공 후 프로젝트 화면을 재검증한다", async () => {
    const form = validForm();
    form.append("newAttachmentUploadIds", uploadId);
    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      form,
    )).rejects.toThrow(`REDIRECT:/announcements/${noticeId}`);

    expect(mocks.create).toHaveBeenCalledWith(actor, expect.objectContaining({ newAttachmentUploadIds: [uploadId] }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/announcements");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/projects", "layout");
  });

  it("전체 공지는 관리자만 작성할 수 있고 대상은 비운다", async () => {
    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      validForm("GLOBAL"),
    )).resolves.toMatchObject({ status: "error" });
    expect(mocks.create).not.toHaveBeenCalled();

    const admin = { id: "10000000-0000-4000-8000-000000000009", role: "ADMIN" as const };
    mocks.actor.mockResolvedValue(admin);
    mocks.audience.mockResolvedValue({ role: "ADMIN", actorId: admin.id, teamIds: [], programIds: [] });
    mocks.create.mockResolvedValue({ id: noticeId, teamId: null, programId: null });

    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      validForm("GLOBAL"),
    )).rejects.toThrow(`REDIRECT:/announcements/${noticeId}`);
    expect(mocks.create).toHaveBeenCalledWith(admin, expect.objectContaining({ teamId: null, programId: null }));
  });

  it("프로그램 대상 공지도 같은 액션으로 작성한다", async () => {
    // 예전에는 팀 대상만 받아 프로그램 공지를 만들 수 없었다.
    const admin = { id: "10000000-0000-4000-8000-000000000009", role: "ADMIN" as const };
    mocks.actor.mockResolvedValue(admin);
    mocks.audience.mockResolvedValue({ role: "ADMIN", actorId: admin.id, teamIds: [], programIds: [programId] });
    mocks.create.mockResolvedValue({ id: noticeId, teamId: null, programId });

    await expect(createAnnouncementAction(
      { status: "idle", message: "" },
      validForm(`program:${programId}`),
    )).rejects.toThrow(`REDIRECT:/announcements/${noticeId}`);
    expect(mocks.create).toHaveBeenCalledWith(admin, expect.objectContaining({ programId, teamId: null }));
  });

  it("수정·삭제 성공 후 프로그램 화면을 재검증한다", async () => {
    mocks.findById.mockResolvedValue({ authorId: actor.id, teamId: null, programId });
    await expect(updateAnnouncementAction(
      noticeId,
      { status: "idle", message: "" },
      validForm(`program:${programId}`),
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

  it("모달에서 수정·삭제하면 검증된 내부 복귀 경로로 이동한다", async () => {
    mocks.findById.mockResolvedValue({ authorId: actor.id, teamId: null, programId });
    const returnTo = `/topics?programId=${programId}`;
    const updateForm = validForm(`program:${programId}`);
    updateForm.set("returnTo", returnTo);
    await expect(updateAnnouncementAction(
      noticeId,
      { status: "idle", message: "" },
      updateForm,
    )).rejects.toThrow(`REDIRECT:${returnTo}`);

    const deleteForm = new FormData();
    deleteForm.set("returnTo", returnTo);
    await expect(deleteAnnouncementAction(
      noticeId,
      { status: "idle", message: "" },
      deleteForm,
    )).rejects.toThrow(`REDIRECT:${returnTo}`);
  });

  it("외부 복귀 경로는 거부한다", async () => {
    const form = new FormData();
    form.set("returnTo", "//evil.example");
    await expect(deleteAnnouncementAction(
      noticeId,
      { status: "idle", message: "" },
      form,
    )).rejects.toThrow("REDIRECT:/announcements");
  });
});
