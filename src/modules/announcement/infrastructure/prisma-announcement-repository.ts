import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AnnouncementCategory,
  AnnouncementMutationOutcome,
  AnnouncementPage,
  AnnouncementRecord,
  AnnouncementRepository,
  AnnouncementWriteInput,
} from "@/modules/announcement/application/announcement-ports";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

const selectAnnouncement = {
  id: true,
  authorId: true,
  title: true,
  content: true,
  category: true,
  pinned: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      name: true,
      role: true,
    },
  },
} as const;

type SelectedAnnouncement = {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    name: string;
    role: "STUDENT" | "PROFESSOR" | "ADMIN";
  };
};

function toRecord(value: SelectedAnnouncement): AnnouncementRecord {
  return {
    id: value.id,
    authorId: value.authorId,
    authorName: value.author.name,
    authorRole: value.author.role,
    title: value.title,
    content: value.content,
    category: value.category,
    pinned: value.pinned,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(page: number, pageSize: number, category?: AnnouncementCategory): Promise<AnnouncementPage> {
    const where = category ? { category } : {};
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
    if (currentPage !== page) return this.list(currentPage, pageSize, category);

    return {
      items: items.map(toRecord),
      page: currentPage,
      total,
      totalPages,
    };
  }

  async findById(id: string): Promise<AnnouncementRecord | null> {
    const announcement = await this.client.announcement.findUnique({
      where: { id },
      select: selectAnnouncement,
    });
    return announcement ? toRecord(announcement) : null;
  }

  async create(
    authorId: string,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementRecord> {
    return toRecord(await this.client.announcement.create({
      data: { authorId, ...input },
      select: selectAnnouncement,
    }));
  }

  async update(
    actor: CurrentActor,
    id: string,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementMutationOutcome> {
    const result = await this.client.announcement.updateMany({
      where: {
        id,
        ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }),
      },
      data: input,
    });
    if (result.count > 0) return "UPDATED";
    return await this.exists(id) ? "FORBIDDEN" : "NOT_FOUND";
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
