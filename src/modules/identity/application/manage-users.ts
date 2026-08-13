import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  createdAt: Date;
  activeResponsibilityCount: number;
};

export type ManagedUserPage = {
  items: ManagedUser[];
  page: number;
  totalPages: number;
  total: number;
};

export interface UserAdministrationRepository {
  list(query: string, requestedPage: number, pageSize: number): Promise<ManagedUserPage>;
  setActive(input: { actorId: string; targetId: string; isActive: boolean; changedAt: Date }): Promise<"UPDATED" | "NOT_FOUND" | "UNCHANGED" | "SELF_DEACTIVATION" | "LAST_ADMIN" | "ACTIVE_PROJECTS">;
}

export class UserAdministrationError extends Error {}

export class UserAdministrationService {
  constructor(
    private readonly repository: UserAdministrationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(actor: CurrentActor, query = "", page = 1) {
    assertAdmin(actor);
    const normalizedQuery = query.trim().slice(0, 100);
    const normalizedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    return this.repository.list(normalizedQuery, normalizedPage, 30);
  }

  async setActive(actor: CurrentActor, targetId: string, isActive: boolean) {
    assertAdmin(actor);
    if (!targetId || targetId.length > 200) throw new UserAdministrationError("사용자 정보를 확인해 주세요.");
    const outcome = await this.repository.setActive({ actorId: actor.id, targetId, isActive, changedAt: this.now() });
    if (outcome === "NOT_FOUND") throw new UserAdministrationError("사용자를 찾을 수 없습니다.");
    if (outcome === "SELF_DEACTIVATION") throw new UserAdministrationError("현재 로그인한 관리자 계정은 비활성화할 수 없습니다.");
    if (outcome === "LAST_ADMIN") throw new UserAdministrationError("마지막 활성 관리자 계정은 비활성화할 수 없습니다.");
    if (outcome === "ACTIVE_PROJECTS") throw new UserAdministrationError("담당 중인 프로젝트가 있는 교수 계정은 비활성화할 수 없습니다. 프로젝트를 다른 교수에게 인계하거나 마감해 주세요.");
    return outcome;
  }
}

function assertAdmin(actor: CurrentActor) {
  if (actor.role !== "ADMIN") throw new UserAdministrationError("관리자만 사용자 상태를 관리할 수 있습니다.");
}
