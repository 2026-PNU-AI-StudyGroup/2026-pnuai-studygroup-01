import type { Prisma } from "@/generated/prisma/client";
import type { OutboxEmailEvent } from "@/modules/email/application/email-delivery-ports";
import { isDirectEmailDeliveryKind, isOptionalEmailKind, normalizeEmailHref } from "@/modules/email/domain/email-delivery";
import { isPusanEmail } from "@/modules/identity/domain/user-role";

type EmailTransaction = Pick<Prisma.TransactionClient, "user" | "emailDelivery">;

type Recipient = {
  id: string;
  email: string;
  emailVerified: boolean;
  accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  preferredLocale: string;
  emailPreference: { reportActivityEnabled: boolean; discussionEnabled: boolean } | null;
};

function preferenceAllows(recipient: Recipient, kind: OutboxEmailEvent["kind"]) {
  if (kind === "REPORT_ACTIVITY") return recipient.emailPreference?.reportActivityEnabled ?? false;
  if (kind === "DISCUSSION") return recipient.emailPreference?.discussionEnabled ?? false;
  return true;
}

export async function enqueueEmailEvents(
  transaction: EmailTransaction,
  events: OutboxEmailEvent[],
): Promise<number> {
  if (!events.length) return 0;
  const recipientIds = [...new Set(events.flatMap((event) => event.recipientId ? [event.recipientId] : []))];
  const recipients = recipientIds.length
    ? await transaction.user.findMany({
        where: { id: { in: recipientIds } },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          accountStatus: true,
          preferredLocale: true,
          emailPreference: { select: { reportActivityEnabled: true, discussionEnabled: true } },
        },
      })
    : [];
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const data: Prisma.EmailDeliveryCreateManyInput[] = [];
  for (const event of events) {
    const recipient = event.recipientId ? recipientsById.get(event.recipientId) : null;
    if (recipient) {
      if (!recipient.emailVerified || !isPusanEmail(recipient.email) || (recipient.accountStatus !== "ACTIVE" && !event.allowInactiveRecipient)) continue;
      if (isOptionalEmailKind(event.kind) && !preferenceAllows(recipient, event.kind)) continue;
      data.push({
        kind: event.kind,
        recipientUserId: recipient.id,
        recipientType: "REGISTERED",
        recipientEmail: recipient.email.toLowerCase(),
        locale: recipient.preferredLocale || "ko",
        title: event.title.trim().slice(0, 180),
        body: event.body.trim().slice(0, 2_000),
        titleEn: event.titleEn.trim().slice(0, 180),
        bodyEn: event.bodyEn.trim().slice(0, 2_000),
        href: normalizeEmailHref(event.href),
        priority: isOptionalEmailKind(event.kind) ? 10 : 100,
        optional: isOptionalEmailKind(event.kind),
        allowInactiveRecipient: event.allowInactiveRecipient ?? false,
        idempotencyKey: event.idempotencyKey,
        availableAt: event.createdAt,
        createdAt: event.createdAt,
      });
      continue;
    }
    if (!isDirectEmailDeliveryKind(event.kind) || !event.recipientEmail || !isPusanEmail(event.recipientEmail)) continue;
    data.push({
      kind: event.kind,
      recipientType: "DIRECT",
      recipientEmail: event.recipientEmail.trim().toLowerCase(),
      locale: "ko",
      title: event.title.trim().slice(0, 180),
      body: event.body.trim().slice(0, 2_000),
      titleEn: event.titleEn.trim().slice(0, 180),
      bodyEn: event.bodyEn.trim().slice(0, 2_000),
      href: normalizeEmailHref(event.href),
      priority: 100,
      optional: false,
      idempotencyKey: event.idempotencyKey,
      availableAt: event.createdAt,
      createdAt: event.createdAt,
    });
  }
  if (!data.length) return 0;
  return transaction.emailDelivery.createMany({ data, skipDuplicates: true }).then(({ count }) => count);
}
