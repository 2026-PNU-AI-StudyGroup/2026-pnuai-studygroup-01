import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementMutationOutcome,
  AnnouncementPage,
  AnnouncementRecord,
  AnnouncementRepository,
  AnnouncementWriteInput,
} from "@/modules/announcement/application/announcement-ports";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

const selectAnnouncement = {
  id: true,
  authorId: true,
  title: true,
  content: true,
  category: true,
  visibility: true,
  pinned: true,
  teamId: true,
  programId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true, role: true } },
  team: { select: { name: true } },
  program: { select: { name: true } },
} as const;

type SelectedAnnouncement = {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  visibility: "AUTHENTICATED" | "TARGET_MEMBERS";
  pinned: boolean;
  teamId: string | null;
  programId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string; role: UserRole };
  team: { name: string } | null;
  program: { name: string } | null;
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
    visibility: value.visibility,
    pinned: value.pinned,
    teamId: value.teamId,
    teamName: value.team?.name ?? null,
    programId: value.programId,
    programName: value.program?.name ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

// 전체 공개 프로그램 공지는 모든 로그인 사용자가 조회할 수 있다.
// 구성원 전용 프로그램·팀 공지는 소속·작성자만 조회하며 ADMIN은 제한이 없다.
export function announcementScopeWhere(audience: AnnouncementAudience) {
  if (audience.role === "ADMIN") return {};
  return {
    OR: [
      { teamId: null, programId: null, visibility: "AUTHENTICATED" as const },
      { teamId: null, programId: { not: null }, visibility: "AUTHENTICATED" as const },
      { teamId: null, programId: { in: audience.programIds } },
      { teamId: { in: audience.teamIds } },
      { authorId: audience.actorId },
    ],
  };
}

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(audience: AnnouncementAudience, page: number, pageSize: number, category?: AnnouncementCategory): Promise<AnnouncementPage> {
    const where = {
      // 졸업과제는 다른 사이트로 이관 — 학생 목록에서는 숨김(특정 카테고리 필터 시엔 그 값 우선).
      ...(category ? { category } : audience.role === "STUDENT" ? { category: { not: "GRADUATION_PROJECT" as const } } : {}),
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
    if (currentPage !== page) return this.list(audience, currentPage, pageSize, category);

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
        teamId: null,
        // 졸업과제는 다른 사이트로 이관 — 학생에게는 프로그램 공지에서도 숨김.
        ...(audience.role === "STUDENT" ? { category: { not: "GRADUATION_PROJECT" as const } } : {}),
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
        teamId,
        programId: null,
        ...announcementScopeWhere(audience),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: selectAnnouncement,
    });
    return items.map(toRecord);
  }

  async listForTeamOverview(audience: AnnouncementAudience, teamId: string): Promise<AnnouncementRecord[]> {
    const items = await this.client.announcement.findMany({
      where: {
        AND: [
          {
            OR: [
              { teamId, programId: null },
              { teamId: null, programId: null },
            ],
          },
          announcementScopeWhere(audience),
        ],
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: selectAnnouncement,
    });
    return items.map(toRecord);
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
