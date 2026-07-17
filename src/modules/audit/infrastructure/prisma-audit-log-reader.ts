import type { PrismaClient } from "@/generated/prisma/client";
import type { AuditLogReader, AuditPage } from "@/modules/audit/application/list-audit-log";

export class PrismaAuditLogReader implements AuditLogReader {
  constructor(private readonly client: PrismaClient) {}

  async list(requestedPage: number, pageSize: number): Promise<AuditPage> {
    const total = await this.client.auditLog.count();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const entries = await this.client.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, action: true, targetType: true, targetId: true, metadata: true, createdAt: true, actor: { select: { name: true } } },
    });
    const userIds = entries.filter(({ targetType }) => targetType === "USER").map(({ targetId }) => targetId);
    const teamIds = entries.flatMap((entry) => {
      if (entry.targetType === "TEAM") return [entry.targetId];
      if (entry.targetType === "REPORT" && isMetadata(entry.metadata) && typeof entry.metadata.teamId === "string") return [entry.metadata.teamId];
      if (entry.targetType === "REPORT_VERSION" && isMetadata(entry.metadata) && typeof entry.metadata.teamId === "string") return [entry.metadata.teamId];
      return [];
    });
    const [users, teams] = await Promise.all([
      this.client.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
      this.client.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } }),
    ]);
    const userById = new Map(users.map((user) => [user.id, `${user.name} · ${user.email}`]));
    const teamById = new Map(teams.map((team) => [team.id, team.name]));
    return {
      items: entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorName: entry.actor.name,
        targetLabel: resolveTargetLabel(entry, userById, teamById),
        createdAt: entry.createdAt,
      })),
      page,
      totalPages,
      total,
    };
  }
}

function isMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveTargetLabel(
  entry: { targetType: string; targetId: string; metadata: unknown },
  userById: Map<string, string>,
  teamById: Map<string, string>,
) {
  if (entry.targetType === "PUSAN_EMAIL") return entry.targetId;
  if (entry.targetType === "USER") return userById.get(entry.targetId) ?? "탈퇴한 사용자";
  if (entry.targetType === "TEAM") return teamById.get(entry.targetId) ?? "종료된 팀";
  if (entry.targetType === "REPORT" && isMetadata(entry.metadata) && typeof entry.metadata.teamId === "string") {
    return `${teamById.get(entry.metadata.teamId) ?? "프로젝트"} 보고서 요구사항`;
  }
  if (entry.targetType === "REPORT_VERSION" && isMetadata(entry.metadata) && typeof entry.metadata.teamId === "string") {
    return `${teamById.get(entry.metadata.teamId) ?? "프로젝트"} 보고서`;
  }
  return entry.targetId;
}
