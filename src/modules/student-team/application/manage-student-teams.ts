import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type {
  StudentTeamReader,
  StudentTeamWriter,
} from "@/modules/student-team/application/student-team-ports";

const PNU_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@pusan\.ac\.kr$/i;

export class StudentTeamOperationError extends Error {}

function assertStudent(actor: CurrentUser) {
  if (actor.role !== "STUDENT") throw new StudentTeamOperationError("학생만 팀을 관리할 수 있습니다.");
}

function normalizedText(value: string, maxLength: number, label: string) {
  const text = value.trim();
  if (!text || text.length > maxLength) throw new StudentTeamOperationError(`${label}을 확인해 주세요.`);
  return text;
}

export class StudentTeamQueryService {
  constructor(private readonly reader: StudentTeamReader) {}

  async listWorkspace(actor: CurrentUser) {
    assertStudent(actor);
    const [teams, invitations] = await Promise.all([
      this.reader.listMine(actor.id),
      this.reader.listInvitations(actor.email.toLowerCase()),
    ]);
    return { teams, invitations };
  }
}

export class StudentTeamCommandService {
  constructor(
    private readonly writer: StudentTeamWriter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(actor: CurrentUser, input: { name: string; description: string }) {
    assertStudent(actor);
    return this.writer.create({
      leaderId: actor.id,
      name: normalizedText(input.name, 80, "팀 이름"),
      description: input.description.trim().slice(0, 1_000),
      createdAt: this.now(),
    });
  }

  async invite(actor: CurrentUser, input: { teamId: string; email: string }) {
    assertStudent(actor);
    const email = input.email.trim().toLowerCase();
    if (!PNU_EMAIL.test(email) || email === actor.email.toLowerCase()) {
      throw new StudentTeamOperationError("본인을 제외한 부산대학교 이메일을 입력해 주세요.");
    }
    const result = await this.writer.invite({ teamId: input.teamId, leaderId: actor.id, email, invitedAt: this.now() });
    if (result !== "INVITED") {
      throw new StudentTeamOperationError(
        result === "ALREADY_MEMBER"
          ? "이미 팀에 참여 중인 사용자입니다."
          : "팀장만 활성 팀에 초대할 수 있습니다.",
      );
    }
  }

  async respond(actor: CurrentUser, invitationId: string, decision: "ACCEPT" | "DECLINE") {
    assertStudent(actor);
    const result = await this.writer.respond({
      invitationId,
      studentId: actor.id,
      email: actor.email.toLowerCase(),
      decision,
      respondedAt: this.now(),
    });
    if (result !== "ACCEPTED" && result !== "DECLINED") {
      throw new StudentTeamOperationError("이미 처리되었거나 유효하지 않은 초대입니다.");
    }
  }

  async transferLeadership(actor: CurrentUser, teamId: string, nextLeaderId: string) {
    assertStudent(actor);
    if (!await this.writer.transferLeadership({ teamId, leaderId: actor.id, nextLeaderId, changedAt: this.now() })) {
      throw new StudentTeamOperationError("팀장 권한은 현재 팀원에게만 이전할 수 있습니다.");
    }
  }

  async removeMember(actor: CurrentUser, teamId: string, studentId: string) {
    assertStudent(actor);
    if (!await this.writer.removeMember({ teamId, leaderId: actor.id, studentId, changedAt: this.now() })) {
      throw new StudentTeamOperationError("팀장 본인은 내보낼 수 없으며, 팀장만 팀원을 관리할 수 있습니다.");
    }
  }

  async leave(actor: CurrentUser, teamId: string) {
    assertStudent(actor);
    const result = await this.writer.leave({ teamId, studentId: actor.id, leftAt: this.now() });
    if (result === "LEADER_TRANSFER_REQUIRED") {
      throw new StudentTeamOperationError("팀장은 다른 현재 팀원에게 팀장을 이전한 뒤 탈퇴할 수 있습니다.");
    }
    if (result !== "LEFT") throw new StudentTeamOperationError("탈퇴할 수 있는 팀이 아닙니다.");
  }

  async delete(actor: CurrentUser, teamId: string) {
    assertStudent(actor);
    if (!await this.writer.delete({ teamId, leaderId: actor.id, deletedAt: this.now() })) {
      throw new StudentTeamOperationError("팀장만 활성 팀을 삭제할 수 있습니다.");
    }
  }
}
