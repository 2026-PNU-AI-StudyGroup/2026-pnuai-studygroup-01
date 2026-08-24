import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AnnouncementAudience,
  AnnouncementCreateOutcome,
  AnnouncementMutationOutcome,
  AnnouncementPage,
  AnnouncementRecord,
  AnnouncementRepository,
  AnnouncementWriteInput,
} from "@/modules/announcement/application/announcement-ports";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ANNOUNCEMENT_ATTACHMENT_MAX_COUNT } from "@/modules/file/domain/upload-policy";
import { isAnnouncementAttachmentSetAllowed } from "@/modules/announcement/domain/announcement-attachment-policy";
import { allowsPopup } from "@/modules/announcement/domain/announcement-policy";
import type { UserRole } from "@/modules/identity/domain/user-role";

const selectAnnouncement = {
  id: true,
  authorId: true,
  title: true,
  content: true,
  visibility: true,
  pinned: true,
  popup: true,
  projectTeamId: true,
  programId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true, role: true } },
  projectTeam: { select: { name: true, projectId: true } },
  program: { select: { name: true } },
  attachments: {
    orderBy: { position: "asc" as const },
    select: {
      fileId: true,
      position: true,
      file: { select: { originalName: true, contentType: true, size: true } },
    },
  },
} as const;

type SelectedAnnouncement = {
  id: string;
  authorId: string;
  title: string;
  content: string;
  visibility: "AUTHENTICATED" | "TARGET_MEMBERS";
  pinned: boolean;
  popup: boolean;
  projectTeamId: string | null;
  programId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string; role: UserRole };
  projectTeam: { name: string; projectId: string } | null;
  program: { name: string } | null;
  attachments: Array<{
    fileId: string;
    position: number;
    file: { originalName: string; contentType: string; size: number };
  }>;
};

function toRecord(value: SelectedAnnouncement): AnnouncementRecord {
  return {
    id: value.id,
    authorId: value.authorId,
    authorName: value.author.name,
    authorRole: value.author.role,
    title: value.title,
    content: value.content,
    visibility: value.visibility,
    pinned: value.pinned,
    popup: value.popup,
    teamId: value.projectTeamId,
    teamName: value.projectTeam?.name ?? null,
    projectId: value.projectTeam?.projectId ?? null,
    programId: value.programId,
    programName: value.program?.name ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    attachments: value.attachments.map((attachment) => ({
      fileId: attachment.fileId,
      position: attachment.position,
      originalName: attachment.file.originalName,
      contentType: attachment.file.contentType,
      size: attachment.file.size,
    })),
  };
}

// 전체 공개 프로그램 공지는 모든 로그인 사용자가 조회할 수 있다.
// 구성원 전용 프로그램·팀 공지는 소속·작성자만 조회하며 ADMIN은 제한이 없다.
export function announcementScopeWhere(audience: AnnouncementAudience) {
  if (audience.role === "ADMIN") return {};
  return {
    OR: [
      { projectTeamId: null, programId: null, visibility: "AUTHENTICATED" as const },
      { projectTeamId: null, programId: { not: null }, visibility: "AUTHENTICATED" as const },
      { projectTeamId: null, programId: { in: audience.programIds } },
      { projectTeamId: { in: audience.teamIds } },
      { authorId: audience.actorId },
    ],
  };
}

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly client: PrismaClient) {}

  async listSystem(audience: AnnouncementAudience, page: number, pageSize: number): Promise<AnnouncementPage> {
    const where = {
      projectTeamId: null,
      programId: null,
      ...announcementScopeWhere(audience),
    };
    const [items, total] = await this.client.$transaction([
      this.client.announcement.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: selectAnnouncement,
      }),
      this.client.announcement.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    if (currentPage !== page) return this.listSystem(audience, currentPage, pageSize);

    return {
      items: items.map(toRecord),
      page: currentPage,
      total,
      totalPages,
    };
  }

  async listForProgram(audience: AnnouncementAudience, programId: string): Promise<AnnouncementRecord[]> {
    const items = await this.client.announcement.findMany({
      where: {
        programId,
        projectTeamId: null,
        ...announcementScopeWhere(audience),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: selectAnnouncement,
    });
    return items.map(toRecord);
  }

  async listForTeam(audience: AnnouncementAudience, teamId: string): Promise<AnnouncementRecord[]> {
    const items = await this.client.announcement.findMany({
      where: {
        projectTeamId: teamId,
        programId: null,
        ...announcementScopeWhere(audience),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: selectAnnouncement,
    });
    return items.map(toRecord);
  }

  // 팝업은 화면을 가리므로 몇 장까지만 띄운다. 더 있어도 겹쳐서 읽지 못한다.
  async listPopups(): Promise<AnnouncementRecord[]> {
    const announcements = await this.client.announcement.findMany({
      where: { popup: true, projectTeamId: null, programId: null, visibility: "AUTHENTICATED" },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: 3,
      select: selectAnnouncement,
    });
    return announcements.map(toRecord);
  }

  async findById(id: string): Promise<AnnouncementRecord | null> {
    const announcement = await this.client.announcement.findUnique({
      where: { id },
      select: selectAnnouncement,
    });
    return announcement ? toRecord(announcement) : null;
  }

  async create(
    actor: CurrentActor,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementCreateOutcome> {
    const { retainedAttachmentIds, newAttachmentUploadIds, teamId, ...rest } = input;
    const announcementInput = { ...rest, popup: (rest.popup ?? false) && allowsPopup({ teamId, programId: rest.programId }) };
    if (retainedAttachmentIds.length > 0) return "INVALID_ATTACHMENTS";
    return this.client.$transaction(async (transaction) => {
      const files = await transaction.storedFile.findMany({
        where: {
          id: { in: newAttachmentUploadIds },
          projectTeamId: null,
          ownerId: actor.id,
          purpose: "ANNOUNCEMENT",
          consumer: "ANNOUNCEMENT",
          status: "READY",
        },
        select: { id: true, size: true },
      });
      if (!validNewFiles(newAttachmentUploadIds, files)) return "INVALID_ATTACHMENTS";

      const created = await transaction.announcement.create({
        data: { authorId: actor.id, projectTeamId: teamId, ...announcementInput },
        select: { id: true },
      });
      if (files.length > 0) {
        await transaction.announcementAttachment.createMany({
          data: newAttachmentUploadIds.map((fileId, position) => ({
            fileId,
            announcementId: created.id,
            uploadedById: actor.id,
            position,
          })),
        });
      }
      const record = await transaction.announcement.findUniqueOrThrow({
        where: { id: created.id },
        select: selectAnnouncement,
      });
      return toRecord(record);
    });
  }

  async update(
    actor: CurrentActor,
    id: string,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementMutationOutcome> {
    const { retainedAttachmentIds, newAttachmentUploadIds, teamId, ...rest } = input;
    const announcementInput = { ...rest, popup: (rest.popup ?? false) && allowsPopup({ teamId, programId: rest.programId }) };
    return this.client.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ authorId: string }>>(Prisma.sql`
        SELECT "authorId" FROM "announcement" WHERE "id" = ${id} FOR UPDATE
      `);
      if (locked.length === 0) return "NOT_FOUND";
      if (actor.role !== "ADMIN" && locked[0]!.authorId !== actor.id) return "FORBIDDEN";
      const existing = await transaction.announcement.findUniqueOrThrow({
        where: { id },
        select: {
          attachments: {
            select: { fileId: true, position: true, file: { select: { size: true } } },
          },
        },
      });

      const retained = existing.attachments.filter((attachment) => retainedAttachmentIds.includes(attachment.fileId));
      if (retained.length !== retainedAttachmentIds.length) return "INVALID_ATTACHMENTS";
      const newFiles = await transaction.storedFile.findMany({
        where: {
          id: { in: newAttachmentUploadIds },
          projectTeamId: null,
          ownerId: actor.id,
          purpose: "ANNOUNCEMENT",
          consumer: "ANNOUNCEMENT",
          status: "READY",
        },
        select: { id: true, size: true },
      });
      if (!validNewFiles(newAttachmentUploadIds, newFiles)) return "INVALID_ATTACHMENTS";
      if (!isAnnouncementAttachmentSetAllowed([
        ...retained.map((attachment) => attachment.file),
        ...newFiles,
      ])) {
        return "INVALID_ATTACHMENTS";
      }

      await transaction.announcementAttachment.deleteMany({
        where: { announcementId: id, fileId: { notIn: retainedAttachmentIds } },
      });
      await transaction.announcement.update({ where: { id }, data: { projectTeamId: teamId, ...announcementInput } });
      if (newAttachmentUploadIds.length > 0) {
        const nextPosition = retained.reduce((maximum, attachment) => Math.max(maximum, attachment.position), -1) + 1;
        await transaction.announcementAttachment.createMany({
          data: newAttachmentUploadIds.map((fileId, index) => ({
            fileId,
            announcementId: id,
            uploadedById: actor.id,
            position: nextPosition + index,
          })),
        });
      }
      return "UPDATED";
    });
  }

  async delete(
    actor: CurrentActor,
    id: string,
  ): Promise<AnnouncementMutationOutcome> {
    const result = await this.client.announcement.deleteMany({
      where: {
        id,
        ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }),
      },
    });
    if (result.count > 0) return "DELETED";
    return await this.exists(id) ? "FORBIDDEN" : "NOT_FOUND";
  }

  private async exists(id: string): Promise<boolean> {
    return await this.client.announcement.findUnique({
      where: { id },
      select: { id: true },
    }) !== null;
  }
}

function validNewFiles(
  requestedIds: string[],
  files: Array<{ id: string; size: number }>,
): boolean {
  return requestedIds.length === files.length &&
    new Set(requestedIds).size === requestedIds.length &&
    requestedIds.length <= ANNOUNCEMENT_ATTACHMENT_MAX_COUNT &&
    isAnnouncementAttachmentSetAllowed(files);
}
