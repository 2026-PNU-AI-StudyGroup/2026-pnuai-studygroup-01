import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ProjectGuidanceRequestReader,
  ProjectGuidanceRequestWriter,
} from "@/modules/project-guidance-request/application/project-guidance-request-ports";
import {
  normalizeProjectGuidanceRequest,
  normalizeProjectGuidanceResponse,
  type ProjectGuidanceRequestKind,
} from "@/modules/project-guidance-request/domain/project-guidance-request-policy";

const PAGE_SIZE = 20;

export class ProjectGuidanceRequestNotFoundError extends Error {
  constructor() {
    super("프로젝트 요청을 찾을 수 없습니다.");
    this.name = "ProjectGuidanceRequestNotFoundError";
  }
}

export class ProjectGuidanceRequestNotAllowedError extends Error {
  constructor() {
    super("현재 프로젝트 상태나 권한으로는 요청을 처리할 수 없습니다.");
    this.name = "ProjectGuidanceRequestNotAllowedError";
  }
}

export class PendingProjectGuidanceRequestExistsError extends Error {
  constructor() {
    super("같은 유형의 답변 대기 요청이 이미 있습니다.");
    this.name = "PendingProjectGuidanceRequestExistsError";
  }
}

export class ProjectGuidanceRequestQueryService {
  constructor(private readonly reader: ProjectGuidanceRequestReader) {}

  async list(actor: CurrentActor, teamId: string, requestedPage = 1) {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
    const requests = await this.reader.findPage(teamId, actor, page, PAGE_SIZE);
    if (!requests) throw new ProjectGuidanceRequestNotFoundError();
    return requests;
  }
}

export class ProjectGuidanceRequestService {
  constructor(private readonly writer: ProjectGuidanceRequestWriter) {}

  async create(actor: CurrentActor, input: {
    teamId: string;
    kind: ProjectGuidanceRequestKind;
    title: string;
    content: string;
    referenceUrl?: string;
    preferredAt?: Date;
  }, now = new Date()) {
    const normalized = normalizeProjectGuidanceRequest(input, now);
    const result = await this.writer.create({
      teamId: input.teamId,
      actor,
      kind: input.kind,
      ...normalized,
      requestedAt: now,
    });
    if (result === "PENDING_EXISTS") throw new PendingProjectGuidanceRequestExistsError();
    if (result === "NOT_ALLOWED") throw new ProjectGuidanceRequestNotAllowedError();
  }

  async respond(actor: CurrentActor, input: {
    requestId: string;
    response: string;
    scheduledAt?: Date;
  }, now = new Date()) {
    const normalized = normalizeProjectGuidanceResponse(input, now);
    const responded = await this.writer.respond({
      requestId: input.requestId,
      actor,
      ...normalized,
      respondedAt: now,
    });
    if (!responded) throw new ProjectGuidanceRequestNotAllowedError();
  }

  async cancel(actor: CurrentActor, requestId: string, now = new Date()) {
    const canceled = await this.writer.cancel({ requestId, actor, canceledAt: now });
    if (!canceled) throw new ProjectGuidanceRequestNotAllowedError();
  }
}
