import { OAuth2Client } from "google-auth-library";
import nodemailer, { type Transporter } from "nodemailer";

import type { ClaimedEmailDelivery, EmailTransport, RenderedEmail } from "@/modules/email/application/email-delivery-ports";
import type { EmailEnvironment } from "@/modules/email/infrastructure/email-environment";

export class GmailOauthSmtpTransport implements EmailTransport {
  private readonly oauthClient: OAuth2Client;
  private transporter: Transporter | null = null;

  constructor(private readonly environment: Extract<EmailEnvironment, { enabled: true }>) {
    this.oauthClient = new OAuth2Client(
      environment.GMAIL_OAUTH_CLIENT_ID,
      environment.GMAIL_OAUTH_CLIENT_SECRET,
    );
    this.oauthClient.setCredentials({ refresh_token: environment.GMAIL_OAUTH_REFRESH_TOKEN });
  }

  async send(input: ClaimedEmailDelivery, message: RenderedEmail): Promise<{ providerMessageId: string | null }> {
    const transporter = await this.getTransporter();
    const result = await transporter.sendMail({
      from: { name: this.environment.EMAIL_FROM_NAME, address: this.environment.GMAIL_SMTP_USER },
      to: input.recipientEmail,
      replyTo: this.environment.EMAIL_REPLY_TO,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId: message.messageId,
      headers: { "X-PMS-Delivery-ID": input.id },
    });
    return { providerMessageId: result.messageId ?? null };
  }

  close() {
    this.transporter?.close();
    this.transporter = null;
  }

  private async getTransporter() {
    if (this.transporter) return this.transporter;
    const accessToken = await this.oauthClient.getAccessToken();
    if (!accessToken.token) throw new Error("GMAIL_OAUTH_ACCESS_TOKEN_UNAVAILABLE");
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 1,
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 30_000,
      auth: {
        type: "OAuth2",
        user: this.environment.GMAIL_SMTP_USER,
        clientId: this.environment.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: this.environment.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: this.environment.GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });
    return this.transporter;
  }
}
