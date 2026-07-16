import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isPusanEmail, normalizeEmail } from "@/modules/identity/domain/user-role";

export type ProfessorAccessRecord = {
  id: string;
  email: string;
  createdAt: Date;
  revokedAt: Date | null;
  account: { name: string; role: "STUDENT" | "PROFESSOR" | "ADMIN" } | null;
};

export type ProfessorAccessAuditRecord = {
  id: string;
  action: "PROFESSOR_ACCESS_GRANTED" | "PROFESSOR_ACCESS_REVOKED";
  targetEmail: string;
  actorName: string;
  createdAt: Date;
};

export interface ProfessorAccessRepository {
  list(): Promise<ProfessorAccessRecord[]>;
  listAudit(): Promise<ProfessorAccessAuditRecord[]>;
  grant(email: string, createdById: string): Promise<void>;
  revoke(email: string, revokedById: string, revokedAt: Date): Promise<boolean>;
}

export class ProfessorAccessForbiddenError extends Error {
  constructor() {
    super("관리자만 교수 권한을 관리할 수 있습니다.");
    this.name = "ProfessorAccessForbiddenError";
  }
}

export class InvalidProfessorEmailError extends Error {
  constructor() {
    super("부산대학교 이메일을 입력해 주세요.");
    this.name = "InvalidProfessorEmailError";
  }
}

export class ProfessorAccessNotFoundError extends Error {
  constructor() {
    super("활성 상태인 교수 허용 항목이 없습니다.");
    this.name = "ProfessorAccessNotFoundError";
  }
}

export class ProfessorAccessService {
  constructor(private readonly repository: ProfessorAccessRepository) {}

  list(actor: CurrentActor): Promise<ProfessorAccessRecord[]> {
    this.assertAdmin(actor);
    return this.repository.list();
  }

  listAudit(actor: CurrentActor): Promise<ProfessorAccessAuditRecord[]> {
    this.assertAdmin(actor);
    return this.repository.listAudit();
  }

  async grant(actor: CurrentActor, email: string): Promise<void> {
    this.assertAdmin(actor);
    const normalizedEmail = this.normalizeProfessorEmail(email);
    await this.repository.grant(normalizedEmail, actor.id);
  }

  async revoke(actor: CurrentActor, email: string, revokedAt = new Date()): Promise<void> {
    this.assertAdmin(actor);
    const normalizedEmail = this.normalizeProfessorEmail(email);
    if (!(await this.repository.revoke(normalizedEmail, actor.id, revokedAt))) {
      throw new ProfessorAccessNotFoundError();
    }
  }

  private assertAdmin(actor: CurrentActor): void {
    if (actor.role !== "ADMIN") throw new ProfessorAccessForbiddenError();
  }

  private normalizeProfessorEmail(email: string): string {
    const normalizedEmail = normalizeEmail(email);
    if (!isPusanEmail(normalizedEmail)) throw new InvalidProfessorEmailError();
    return normalizedEmail;
  }
}
