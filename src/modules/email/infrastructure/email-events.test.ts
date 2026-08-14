import { describe, expect, it, vi } from "vitest";

import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

const createdAt = new Date("2026-08-14T00:00:00.000Z");

function transaction(recipients: Array<{
  id: string;
  email: string;
  emailVerified: boolean;
  accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  preferredLocale: string;
  emailPreference: { reportActivityEnabled: boolean; discussionEnabled: boolean } | null;
}>) {
  const createMany = vi.fn(async () => ({ count: 1 }));
  return {
    value: {
      user: { findMany: vi.fn(async () => recipients) },
      emailDelivery: { createMany },
    } as never,
    createMany,
  };
}

describe("enqueueEmailEvents", () => {
  it("검증된 학교 이메일만 사용하고 contactEmail이나 선택형 기본 OFF를 우회하지 않는다", async () => {
    const tx = transaction([
      {
        id: "student-1",
        email: "student@pusan.ac.kr",
        emailVerified: true,
        accountStatus: "ACTIVE",
        preferredLocale: "en",
        emailPreference: { reportActivityEnabled: false, discussionEnabled: false },
      },
    ]);

    await enqueueEmailEvents(tx.value, [
      {
        kind: "REPORT_ACTIVITY",
        recipientId: "student-1",
        title: "보고서가 제출되었습니다",
        body: "검토해 주세요.",
        titleEn: "Report submitted",
        bodyEn: "Review the submitted report in PMS.",
        href: "/projects/project-1/reports",
        idempotencyKey: "optional-off",
        createdAt,
      },
      {
        kind: "TASK_ASSIGNMENT",
        recipientId: "student-1",
        title: "새 할 일이 배정되었습니다",
        body: "마감을 확인해 주세요.",
        titleEn: "New task assigned",
        bodyEn: "Review the task deadline in PMS.",
        href: "/projects/project-1/tasks",
        idempotencyKey: "task-1",
        createdAt,
      },
    ]);

    expect(tx.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        kind: "TASK_ASSIGNMENT",
        recipientEmail: "student@pusan.ac.kr",
        locale: "en",
        optional: false,
        allowInactiveRecipient: false,
        idempotencyKey: "task-1",
      })],
      skipDuplicates: true,
    });
  });

  it("미가입 수신자도 학교 이메일만 대기열에 기록한다", async () => {
    const tx = transaction([]);

    await enqueueEmailEvents(tx.value, [
      {
        kind: "TEAM_INVITATION",
        recipientEmail: "future.student@pusan.ac.kr",
        title: "팀 초대",
        body: "초대를 확인해 주세요.",
        titleEn: "Team invitation",
        bodyEn: "Review your team invitation in PMS.",
        href: "/teams",
        idempotencyKey: "invite-pusan",
        createdAt,
      },
      {
        kind: "TASK_ASSIGNMENT",
        recipientEmail: "future.student@pusan.ac.kr",
        title: "할 일",
        body: "확인해 주세요.",
        href: "/projects/project-1/tasks",
        idempotencyKey: "task-direct-recipient",
        createdAt,
      } as never,
      {
        kind: "TEAM_INVITATION",
        recipientEmail: "personal@example.com",
        title: "팀 초대",
        body: "초대를 확인해 주세요.",
        titleEn: "Team invitation",
        bodyEn: "Review your team invitation in PMS.",
        href: "/teams",
        idempotencyKey: "invite-personal",
        createdAt,
      },
    ]);

    expect(tx.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ recipientEmail: "future.student@pusan.ac.kr", locale: "ko" })],
      skipDuplicates: true,
    });
  });

  it("계정 상태 통지 예외는 worker까지 보존한다", async () => {
    const tx = transaction([
      {
        id: "disabled-user",
        email: "disabled@pusan.ac.kr",
        emailVerified: true,
        accountStatus: "DISABLED",
        preferredLocale: "ko",
        emailPreference: null,
      },
    ]);

    await enqueueEmailEvents(tx.value, [{
      kind: "ACCOUNT_STATUS",
      recipientId: "disabled-user",
      title: "계정이 비활성화되었습니다",
      body: "관리자에게 문의해 주세요.",
      titleEn: "Account disabled",
      bodyEn: "Contact an administrator if you need assistance.",
      href: "/account",
      idempotencyKey: "disabled-account-status",
      createdAt,
      allowInactiveRecipient: true,
    }]);

    expect(tx.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ allowInactiveRecipient: true })],
      skipDuplicates: true,
    });
  });
});
