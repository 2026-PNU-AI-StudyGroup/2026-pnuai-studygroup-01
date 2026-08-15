import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaEmailDeliveryWorker } from "@/modules/email/infrastructure/prisma-email-delivery-worker";

const runIntegration = process.env.EMAIL_DELIVERY_INTEGRATION_TEST === "true" ? it : it.skip;

describe("PrismaEmailDeliveryWorker PostgreSQL integration", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    if (!process.env.EMAIL_DELIVERY_INTEGRATION_TEST) return;
    ({ prisma } = await import("@/shared/infrastructure/database/prisma"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  runIntegration("실제 PostgreSQL에서 stale 작업을 선점하고 worker 소유자로 fenced transition한다", async () => {
    const client = prisma;
    if (!client) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
    const id = randomUUID();
    const idempotencyKey = `email-worker-integration:${id}`;
    const worker = new PrismaEmailDeliveryWorker(
      client,
      { send: async () => ({ providerMessageId: null }) },
      "https://pms.example.pusan.ac.kr",
    );
    try {
      await client.emailDelivery.create({
        data: {
          id,
          kind: "TEAM_INVITATION",
          recipientType: "DIRECT",
          recipientEmail: `integration-${id}@pusan.ac.kr`,
          locale: "ko",
          title: "통합 테스트 초대",
          body: "SMTP를 호출하지 않는 PostgreSQL 선점 테스트입니다.",
          titleEn: "Integration test invitation",
          bodyEn: "This PostgreSQL claim test does not send SMTP mail.",
          href: "/teams",
          priority: 2_147_483_647,
          idempotencyKey,
          availableAt: new Date(),
          status: "PROCESSING",
          attempts: 1,
          lockedAt: new Date(Date.now() - 11 * 60_000),
          lockedBy: "stale-worker",
        },
      });
      const claimed = await (worker as unknown as {
        claim: (limit: number, now: Date, includeOptional: boolean) => Promise<Array<{
          id: string;
          attempts: number;
          lockedBy: string;
        }>>;
      }).claim(1, new Date(), true);

      expect(claimed).toHaveLength(1);
      expect(claimed[0]).toEqual(expect.objectContaining({ id, attempts: 2, lockedBy: expect.any(String) }));
      await expect(client.emailDelivery.findUniqueOrThrow({ where: { id } })).resolves.toEqual(expect.objectContaining({
        status: "PROCESSING",
        attempts: 2,
        lockedBy: claimed[0]?.lockedBy,
      }));
      const transitioned = await (worker as unknown as {
        markSent: (deliveryId: string, sentAt: Date, providerMessageId: string | null) => Promise<boolean>;
      }).markSent(id, new Date(), null);
      expect(transitioned).toBe(true);
      await expect(client.emailDelivery.findUniqueOrThrow({ where: { id } })).resolves.toEqual(expect.objectContaining({
        status: "SENT",
        title: null,
        body: null,
        titleEn: null,
        bodyEn: null,
        href: null,
        lastError: null,
      }));
    } finally {
      await client.emailDelivery.deleteMany({ where: { id } });
    }
  });
});
