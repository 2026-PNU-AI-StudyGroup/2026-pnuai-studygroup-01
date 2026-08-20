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

export type SetAdminRoleOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "UNCHANGED"
  | "SELF_DEMOTION"
  | "LAST_ADMIN"
  | "WITHDRAWN"
  | "EXTERNAL_ADVISOR";

export const USER_LIST_ROLE_FILTERS = ["ALL", "STUDENT", "PROFESSOR", "ADMIN", "ADVISOR"] as const;
export const USER_LIST_STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE"] as const;

export type UserListRoleFilter = (typeof USER_LIST_ROLE_FILTERS)[number];
export type UserListStatusFilter = (typeof USER_LIST_STATUS_FILTERS)[number];
export type UserListFilters = { role: UserListRoleFilter; status: UserListStatusFilter };

export function resolveUserListRoleFilter(value: string | undefined): UserListRoleFilter {
  return USER_LIST_ROLE_FILTERS.find((filter) => filter === value) ?? "ALL";
}

export function resolveUserListStatusFilter(value: string | undefined): UserListStatusFilter {
  return USER_LIST_STATUS_FILTERS.find((filter) => filter === value) ?? "ALL";
}

export interface UserAdministrationRepository {
  list(query: string, requestedPage: number, pageSize: number, filters: UserListFilters): Promise<ManagedUserPage>;
  setActive(input: { actorId: string; targetId: string; isActive: boolean; changedAt: Date }): Promise<"UPDATED" | "NOT_FOUND" | "UNCHANGED" | "SELF_DEACTIVATION" | "LAST_ADMIN" | "ACTIVE_PROJECTS">;
  setAdminRole(input: { actorId: string; targetId: string; isAdmin: boolean; changedAt: Date }): Promise<SetAdminRoleOutcome>;
}

export class UserAdministrationError extends Error {}

export class UserAdministrationService {
  constructor(
    private readonly repository: UserAdministrationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(actor: CurrentActor, query = "", page = 1, filters: Partial<UserListFilters> = {}) {
    assertAdmin(actor);
    const normalizedQuery = query.trim().slice(0, 100);
    const normalizedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    // 행 높이를 줄여 한 화면에 더 많이 담는다. 그만큼 한 페이지 인원도 늘린다.
    return this.repository.list(normalizedQuery, normalizedPage, 50, {
      role: resolveUserListRoleFilter(filters.role),
      status: resolveUserListStatusFilter(filters.status),
    });
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

  /**
   * 관리자 권한만 여기에서 부여·회수한다. 교수 역할은 허용목록(교수 권한 화면)이 기준이라
   * 여기에서 바꿔도 다음 로그인에 되돌아가므로 다루지 않는다. 관리자를 해제하면 학생으로
   * 내려가고, 허용목록에 있는 계정은 다음 로그인에 교수로 복구된다.
   */
  async setAdminRole(actor: CurrentActor, targetId: string, isAdmin: boolean) {
    assertAdmin(actor);
    if (!targetId || targetId.length > 200) throw new UserAdministrationError("사용자 정보를 확인해 주세요.");
    const outcome = await this.repository.setAdminRole({ actorId: actor.id, targetId, isAdmin, changedAt: this.now() });
    if (outcome === "NOT_FOUND") throw new UserAdministrationError("사용자를 찾을 수 없습니다.");
    if (outcome === "SELF_DEMOTION") throw new UserAdministrationError("현재 로그인한 관리자 계정의 권한은 해제할 수 없습니다.");
    if (outcome === "LAST_ADMIN") throw new UserAdministrationError("마지막 관리자 계정의 권한은 해제할 수 없습니다.");
    if (outcome === "WITHDRAWN") throw new UserAdministrationError("탈퇴한 계정의 권한은 변경할 수 없습니다.");
    if (outcome === "EXTERNAL_ADVISOR") throw new UserAdministrationError("외부 자문위원 계정은 관리자로 지정할 수 없습니다.");
    return outcome;
  }
}

function assertAdmin(actor: CurrentActor) {
  if (actor.role !== "ADMIN") throw new UserAdministrationError("관리자만 사용자 상태를 관리할 수 있습니다.");
}
