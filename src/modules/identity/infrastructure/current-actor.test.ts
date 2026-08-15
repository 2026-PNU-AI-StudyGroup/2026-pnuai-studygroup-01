import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentActor } from "./current-actor";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/modules/identity/infrastructure/auth", () => ({ auth: { api: { getSession } } }));

describe("현재 로그인 사용자", () => {
  beforeEach(() => getSession.mockReset());

  it("헤더에 필요한 이름과 이메일을 역할 정보와 함께 반환한다", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1", role: "STUDENT", name: "김학생", email: "student@pusan.ac.kr", image: null, accountStatus: "ACTIVE" } });
    await expect(getCurrentActor()).resolves.toEqual({ id: "user-1", role: "STUDENT", name: "김학생", email: "student@pusan.ac.kr", image: null });
  });

  it("세션이 없으면 로그인 사용자가 없다고 반환한다", async () => {
    getSession.mockResolvedValue(null);
    await expect(getCurrentActor()).resolves.toBeNull();
  });

  it("비활성 계정의 기존 세션을 로그인 상태로 인정하지 않는다", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1", role: "STUDENT", name: "김학생", email: "student@pusan.ac.kr", image: null, accountStatus: "DISABLED" } });
    await expect(getCurrentActor()).resolves.toBeNull();
  });
});
