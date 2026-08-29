import type { Prisma } from "@/generated/prisma/client";
import type { OutboxEmailEvent } from "@/modules/email/application/email-delivery-ports";
import { EMAIL_PREFERENCE_SELECT, emailPreferenceAllows, isDirectEmailDeliveryKind, isOptionalEmailKind, normalizeEmailHref } from "@/modules/email/domain/email-delivery";
import { isPusanEmail } from "@/modules/identity/domain/user-role";

type EmailTransaction = Pick<Prisma.TransactionClient, "user" | "emailDelivery">;


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
          emailPreference: { select: EMAIL_PREFERENCE_SELECT },
        },
      })
    : [];
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const data: Prisma.EmailDeliveryCreateManyInput[] = [];
  for (const event of events) {
    const recipient = event.recipientId ? recipientsById.get(event.recipientId) : null;
    if (recipient) {
      if (!recipient.emailVerified || !isPusanEmail(recipient.email) || (recipient.accountStatus !== "ACTIVE" && !event.allowInactiveRecipient)) continue;
      if (!emailPreferenceAllows(event.kind, recipient.emailPreference)) continue;
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
