import type { DirectEmailDeliveryKind, EmailDeliveryKind } from "@/modules/email/domain/email-delivery";

type OutboxEmailEventBase = {
  kind: EmailDeliveryKind;
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
  href: string;
  idempotencyKey: string;
  createdAt: Date;
};

type RegisteredOutboxEmailEvent = OutboxEmailEventBase & {
  recipientId: string;
  recipientEmail?: never;
  allowInactiveRecipient?: boolean;
};

type DirectOutboxEmailEvent = Omit<OutboxEmailEventBase, "kind"> & {
  kind: DirectEmailDeliveryKind;
  recipientId?: never;
  recipientEmail: string;
  allowInactiveRecipient?: never;
};

export type OutboxEmailEvent = RegisteredOutboxEmailEvent | DirectOutboxEmailEvent;

export type ClaimedEmailDelivery = {
  id: string;
  kind: EmailDeliveryKind;
  recipientUserId: string | null;
  recipientType: "REGISTERED" | "DIRECT";
  recipientEmail: string;
  locale: string;
  title: string;
  body: string;
  titleEn: string | null;
  bodyEn: string | null;
  href: string;
  optional: boolean;
  allowInactiveRecipient: boolean;
  lockedBy: string;
  attempts: number;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  messageId: string;
};

export interface EmailTransport {
  send(input: ClaimedEmailDelivery, message: RenderedEmail): Promise<{ providerMessageId: string | null }>;
  close?(): void | Promise<void>;
}
