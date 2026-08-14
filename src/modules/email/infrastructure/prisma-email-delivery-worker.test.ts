import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ClaimedEmailDelivery } from "@/modules/email/application/email-delivery-ports";
import { PrismaEmailDeliveryWorker } from "@/modules/email/infrastructure/prisma-email-delivery-worker";

const now = new Date("2026-08-14T00:00:00.000Z");
const job: ClaimedEmailDelivery = {
  id: "delivery-1",
  kind: "TASK_ASSIGNMENT" as const,
  recipientUserId: "student-1",
  recipientType: "REGISTERED",
  recipientEmail: "student@pusan.ac.kr",
  locale: "ko",
  title: "새 할 일",
  body: "확인해 주세요.",
  titleEn: "New task assigned",
  bodyEn: "Review the task in PMS.",
  href: "/projects/project-1/tasks",
  optional: false,
  allowInactiveRecipient: false,
  lockedBy: "worker-1",
  attempts: 1,
};

type Recipient = {
  email: string;
  emailVerified: boolean;
  accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  emailPreference: { reportActivityEnabled: boolean; discussionEnabled: boolean } | null;
};

const activeRecipient: Recipient = {
  email: "student@pusan.ac.kr",
  emailVerified: true,
  accountStatus: "ACTIVE" as const,
  emailPreference: { reportActivityEnabled: true, discussionEnabled: true },
};

function client({ history = [], optionalHistory = [], jobs = [job], recipient = activeRecipient, transitionCount = 1 }: {
  history?: Array<{ sentAt: Date }>;
  optionalHistory?: Array<{ sentAt: Date }>;
  jobs?: ClaimedEmailDelivery[];
  recipient?: Recipient | null;
  transitionCount?: number;
} = {}) {
  const leaseQuery = vi.fn()
    .mockResolvedValueOnce([{ acquired: true }])
    .mockResolvedValueOnce([{ name: "gmail-smtp" }]);
  const updateMany = vi.fn(async (input: { where?: { id?: string | { in: string[] } } }) => ({
    count: typeof input.where?.id === "string" ? transitionCount : 2,
  }));
  const value = {
    $transaction: vi.fn(async (operation: (transaction: { $queryRaw: typeof leaseQuery; $executeRaw: ReturnType<typeof vi.fn> }) => unknown) => operation({
      $queryRaw: leaseQuery,
      $executeRaw: vi.fn(async () => 1),
    })),
    $queryRaw: vi.fn(async () => jobs),
    emailDelivery: {
      findMany: vi.fn()
        .mockResolvedValueOnce(history)
        .mockResolvedValueOnce(optionalHistory),
      updateMany,
    },
    user: { findUnique: vi.fn(async () => recipient) },
    emailWorkerLease: { updateMany: vi.fn(async () => ({ count: 1 })) },
  } as unknown as PrismaClient;
  return { value, updateMany };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PrismaEmailDeliveryWorker", () => {
  it("하나의 선점 작업을 Gmail SMTP 접수 성공으로 기록하고 transport를 닫는다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = client();
    const transport = {
      send: vi.fn(async () => ({ providerMessageId: "<gmail-id>" })),
      close: vi.fn(),
    };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ claimed: 1, sent: 1, retried: 0, failed: 0, skipped: false });
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: job.id, status: "PROCESSING", lockedBy: expect.any(String) }),
      data: expect.objectContaining({
        status: "SENT",
        providerMessageId: "<gmail-id>",
        lockedAt: null,
        lockedBy: null,
        title: null,
        body: null,
        titleEn: null,
        bodyEn: null,
        href: null,
        lastError: null,
      }),
    }));
    expect(transport.close).toHaveBeenCalledOnce();
  });

  it("Gmail 인증 오류는 현재 작업을 재시도 상태로 돌리고 남은 배치를 중단한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const secondJob = { ...job, id: "delivery-2", attempts: 1 };
    const db = client({ jobs: [job, secondJob] });
    const transport = { send: vi.fn(async () => { throw new Error("SMTP 535 Authentication failed"); }) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ claimed: 2, retried: 1, authenticationFailed: true, sent: 0 });
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: job.id, status: "PROCESSING", lockedBy: expect.any(String) }),
      data: expect.objectContaining({ status: "RETRY_WAIT", attempts: { decrement: 1 }, lockedAt: null, lockedBy: null }),
    }));
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: [secondJob.id] }, status: "PROCESSING", lockedBy: expect.any(String) }),
    }));
  });

  it("24시간 450건 한도에 도달하면 대기 작업을 실패시키지 않고 다음 가능 시각으로 이월한다", async () => {
    const oldest = new Date(now.getTime() - 23 * 60 * 60_000);
    const db = client({ history: Array.from({ length: 450 }, () => ({ sentAt: oldest })) });
    const transport = { send: vi.fn(async () => ({ providerMessageId: null })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ claimed: 0, deferred: 2, sent: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ["PENDING", "RETRY_WAIT"] } }),
      data: expect.objectContaining({ status: "RETRY_WAIT", availableAt: new Date(oldest.getTime() + 24 * 60 * 60_000) }),
    }));
  });

  it("24시간 449건에서는 마지막 한 건을 발송한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = client({ history: Array.from({ length: 449 }, () => ({ sentAt: now })) });
    const transport = { send: vi.fn(async () => ({ providerMessageId: null })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ claimed: 1, sent: 1, deferred: 0 });
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it("선점 뒤 수신 거부한 선택형 메일은 SMTP 호출 없이 취소한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const optionalJob = { ...job, kind: "REPORT_ACTIVITY" as const, optional: true };
    const db = client({
      jobs: [optionalJob],
      recipient: { ...activeRecipient, emailPreference: { reportActivityEnabled: false, discussionEnabled: true } },
    });
    const transport = { send: vi.fn(async () => ({ providerMessageId: null })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ canceled: 1, sent: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(db.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: optionalJob.id, status: "PROCESSING", lockedBy: expect.any(String) }),
      data: {
        status: "CANCELED",
        lockedAt: null,
        lockedBy: null,
        title: null,
        body: null,
        titleEn: null,
        bodyEn: null,
        href: null,
        lastError: null,
      },
    });
  });

  it("선점 뒤 비활성화된 계정의 일반 메일은 SMTP 호출 없이 취소한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = client({ jobs: [job], recipient: { ...activeRecipient, accountStatus: "DISABLED" } });
    const transport = { send: vi.fn(async () => ({ providerMessageId: null })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ canceled: 1, sent: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(db.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: job.id, status: "PROCESSING", lockedBy: expect.any(String) }),
      data: {
        status: "CANCELED",
        lockedAt: null,
        lockedBy: null,
        title: null,
        body: null,
        titleEn: null,
        bodyEn: null,
        href: null,
        lastError: null,
      },
    });
  });

  it("비활성 계정의 계정 상태 통지는 예외적으로 발송한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const accountStatusJob = { ...job, kind: "ACCOUNT_STATUS" as const, allowInactiveRecipient: true };
    const db = client({ jobs: [accountStatusJob], recipient: { ...activeRecipient, accountStatus: "DISABLED" } });
    const transport = { send: vi.fn(async () => ({ providerMessageId: null })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ canceled: 0, sent: 1 });
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it("소유권을 잃은 작업은 stale worker가 상태를 덮어쓰지 않는다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = client({ transitionCount: 0 });
    const transport = { send: vi.fn(async () => ({ providerMessageId: "<gmail-id>" })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ sent: 0, skipped: true });
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: job.id, status: "PROCESSING", lockedBy: expect.any(String) }),
    }));
  });

  it("재시도 시각은 오래된 배치 시각이 아니라 실제 실패 시각을 기준으로 계산한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const failedAt = new Date("2026-08-14T00:10:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(failedAt);
    const db = client();
    const transport = { send: vi.fn(async () => { throw new Error("socket timeout"); }) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ retried: 1 });
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: job.id, status: "PROCESSING", lockedBy: expect.any(String) }),
      data: expect.objectContaining({ availableAt: new Date(failedAt.getTime() + 60_000) }),
    }));
  });

  it("삭제된 등록 수신자는 직접 수신자로 재분류하지 않고 취소한다", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = client({ jobs: [{ ...job, recipientUserId: null, recipientType: "REGISTERED" }] });
    const transport = { send: vi.fn(async () => ({ providerMessageId: null })) };

    const result = await new PrismaEmailDeliveryWorker(db.value, transport, "https://pms.example.pusan.ac.kr")
      .processBatch(25, now);

    expect(result).toMatchObject({ canceled: 1, sent: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "CANCELED", title: null, body: null, href: null, lastError: null }),
    }));
  });
});
