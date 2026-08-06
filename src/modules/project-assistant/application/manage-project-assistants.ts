import type {
  ProjectAssistantReader,
  ProjectAssistantWriter,
} from "@/modules/project-assistant/application/project-assistant-ports";
import type {
  CurrentActor,
  CurrentUser,
} from "@/modules/identity/domain/current-actor";
import { canAccessProfessorWorkspace as canAccessProfessorWorkspaceByPolicy } from "@/modules/project-assistant/domain/project-assistant-policy";

export class ProjectAssistantOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectAssistantOperationError";
  }
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 320) {
    throw new ProjectAssistantOperationError("유효한 사용자 이메일을 입력해 주세요.");
  }
  return normalized;
}

export class ProjectAssistantQueryService {
  constructor(private readonly reader: ProjectAssistantReader) {}

  async canAccessProfessorWorkspace(actor: CurrentActor): Promise<boolean> {
    if (canAccessProfessorWorkspaceByPolicy(actor, false)) return true;
    return canAccessProfessorWorkspaceByPolicy(
      actor,
      await this.reader.hasSupervisedTopic(actor),
    );
  }

  async getManagement(actor: CurrentActor, topicId: string) {
    const management = await this.reader.findManagement(topicId, actor);
    if (!management) {
      throw new ProjectAssistantOperationError("프로젝트 조교를 관리할 권한이 없습니다.");
    }
    return management;
  }

  listPending(actor: CurrentActor) {
    return this.reader.listPendingInvitations(actor.id);
  }
}

export class ProjectAssistantCommandService {
  constructor(
    private readonly writer: ProjectAssistantWriter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async invite(actor: CurrentUser, input: { topicId: string; email: string }) {
    const result = await this.writer.invite({
      topicId: input.topicId,
      actor,
      email: normalizeEmail(input.email),
      invitedAt: this.now(),
    });
    if (result === "INVITED") return;
    const messages = {
      NOT_FOUND: "해당 이메일로 가입한 사용자를 찾을 수 없습니다.",
      INACTIVE: "비활성화된 사용자는 조교로 초대할 수 없습니다.",
      SELF: "프로젝트 관리자 본인은 조교로 초대할 수 없습니다.",
      ALREADY_ASSISTANT: "이미 이 프로젝트의 조교입니다.",
      ALREADY_INVITED: "아직 응답하지 않은 초대가 있습니다.",
      FORBIDDEN: "프로젝트 조교를 초대할 권한이 없습니다.",
    } as const;
    throw new ProjectAssistantOperationError(messages[result]);
  }

  async respond(
    actor: CurrentActor,
    invitationId: string,
    decision: "ACCEPT" | "DECLINE",
  ) {
    const result = await this.writer.respond({
      invitationId,
      actor,
      decision,
      respondedAt: this.now(),
    });
    if (result === "INVALID") {
      throw new ProjectAssistantOperationError("이미 처리되었거나 유효하지 않은 초대입니다.");
    }
  }

  async cancelInvitation(actor: CurrentActor, invitationId: string) {
    if (!await this.writer.cancelInvitation({
      invitationId,
      actor,
      canceledAt: this.now(),
    })) {
      throw new ProjectAssistantOperationError("취소할 수 없는 초대입니다.");
    }
  }

  async remove(actor: CurrentActor, topicId: string, assistantUserId: string) {
    if (!await this.writer.remove({
      topicId,
      assistantUserId,
      actor,
      removedAt: this.now(),
    })) {
      throw new ProjectAssistantOperationError("조교 권한을 해제할 수 없습니다.");
    }
  }
}
