import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type AdminProjectLifecycleIntent = "REQUEST_REVIEW";
export type AdminProjectLifecycleOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "PROGRAM_ENDED"
  | "NO_APPROVAL_HISTORY";

export interface AdminProjectLifecycleWriter {
  transition(input: {
    projectId: string;
    actorId: string;
    intent: AdminProjectLifecycleIntent;
    reason: string;
    changedAt: Date;
  }): Promise<AdminProjectLifecycleOutcome>;
}

export class AdminProjectLifecycleError extends Error {}

export class ManageAdminProjectLifecycleService {
  constructor(
    private readonly writer: AdminProjectLifecycleWriter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(actor: CurrentActor, input: {
    projectId: string;
    intent: AdminProjectLifecycleIntent;
    reason: string;
  }) {
    if (actor.role !== "ADMIN") {
      throw new AdminProjectLifecycleError("관리자만 프로젝트 생명주기를 변경할 수 있습니다.");
    }
    const reason = input.reason.trim();
    if (!reason) throw new AdminProjectLifecycleError("변경 사유를 입력해 주세요.");
    const outcome = await this.writer.transition({
      ...input,
      actorId: actor.id,
      reason: reason.slice(0, 1_000),
      changedAt: this.now(),
    });
    if (outcome === "UPDATED") return;
    throw new AdminProjectLifecycleError(
      outcome === "NOT_FOUND"
        ? "프로젝트를 찾을 수 없습니다."
        : outcome === "PROGRAM_ENDED"
          ? "종료일이 지난 프로그램은 먼저 종료일을 연장해야 합니다."
          : outcome === "NO_APPROVAL_HISTORY"
            ? "재사용할 승인 요청 이력이 없습니다."
            : "현재 상태에서는 이 변경을 수행할 수 없습니다.",
    );
  }
}
