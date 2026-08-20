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
    const topicIds = entries.flatMap((entry) => {
      if (entry.targetType === "TOPIC") return [entry.targetId];
      if (entry.targetType === "PROJECT_ASSISTANT_INVITATION" && isMetadata(entry.metadata) && typeof entry.metadata.topicId === "string") return [entry.metadata.topicId];
      return [];
    });
    const divisionIds = entries.filter(({ targetType }) => targetType === "PROGRAM_DIVISION").map(({ targetId }) => targetId);
    const programIds = entries.filter(({ targetType }) => targetType === "PROJECT_PROGRAM").map(({ targetId }) => targetId);
    const [users, teams, topics, divisions, programs] = await Promise.all([
      this.client.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
      this.client.projectTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } }),
      this.client.topic.findMany({ where: { id: { in: topicIds } }, select: { id: true, title: true } }),
      this.client.programDivision.findMany({ where: { id: { in: divisionIds } }, select: { id: true, name: true } }),
      this.client.projectProgram.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } }),
    ]);
    const userById = new Map(users.map((user) => [user.id, `${user.name} · ${user.email}`]));
    const teamById = new Map(teams.map((team) => [team.id, team.name]));
    const topicById = new Map(topics.map((topic) => [topic.id, topic.title]));
    const divisionById = new Map(divisions.map((division) => [division.id, division.name]));
    const programById = new Map(programs.map((program) => [program.id, program.name]));
    return {
      items: entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorName: entry.actor?.name ?? "시스템",
        targetLabel: resolveTargetLabel(entry, userById, teamById, topicById, divisionById, programById),
        reason: resolveReason(entry.metadata),
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

// 결정에 붙은 사유. 지금은 프로젝트 등록 승인·반려가 남긴다.
function resolveReason(metadata: unknown): string | null {
  if (!isMetadata(metadata) || typeof metadata.reviewComment !== "string") return null;
  const reason = metadata.reviewComment.trim();
  return reason.length ? reason : null;
}

function resolveTargetLabel(
  entry: { targetType: string; targetId: string; metadata: unknown },
  userById: Map<string, string>,
  teamById: Map<string, string>,
  topicById: Map<string, string>,
  divisionById: Map<string, string>,
  programById: Map<string, string>,
) {
  if (entry.targetType === "PUSAN_EMAIL") return entry.targetId;
  if (entry.targetType === "USER") return userById.get(entry.targetId) ?? "탈퇴한 사용자";
  if (entry.targetType === "TEAM") return teamById.get(entry.targetId) ?? "종료된 팀";
  // 삭제된 프로젝트는 조회할 대상이 없다. 지울 때 metadata 에 남긴 이름을 쓴다.
  if (entry.targetType === "TOPIC") {
    return topicById.get(entry.targetId)
      ?? (isMetadata(entry.metadata) && typeof entry.metadata.title === "string" ? entry.metadata.title : "삭제된 프로젝트");
  }
  if (entry.targetType === "PROGRAM_DIVISION") return divisionById.get(entry.targetId) ?? (isMetadata(entry.metadata) && typeof entry.metadata.name === "string" ? entry.metadata.name : "삭제된 분과");
  if (entry.targetType === "PROJECT_PROGRAM") return programById.get(entry.targetId) ?? entry.targetId;
  if (entry.targetType === "PROJECT_ASSISTANT_INVITATION" && isMetadata(entry.metadata) && typeof entry.metadata.topicId === "string") {
    return `${topicById.get(entry.metadata.topicId) ?? "프로젝트"} 조교 초대`;
  }
  if (entry.targetType === "REPORT" && isMetadata(entry.metadata) && typeof entry.metadata.teamId === "string") {
    return `${teamById.get(entry.metadata.teamId) ?? "프로젝트"} 보고서 요구사항`;
  }
  if (entry.targetType === "REPORT_VERSION" && isMetadata(entry.metadata) && typeof entry.metadata.teamId === "string") {
    return `${teamById.get(entry.metadata.teamId) ?? "프로젝트"} 보고서`;
  }
  return entry.targetId;
}
