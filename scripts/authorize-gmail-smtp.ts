import "dotenv/config";

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

import { OAuth2Client } from "google-auth-library";

const redirectUri = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim() || "http://127.0.0.1:43827/oauth2/callback";
const clientId = process.env.GMAIL_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim();
const smtpUser = process.env.GMAIL_SMTP_USER?.trim().toLowerCase();

if (!clientId || !clientSecret || !smtpUser) {
  throw new Error("GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_SMTP_USER 설정이 필요합니다.");
}

const callback = new URL(redirectUri);
if (callback.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(callback.hostname)) {
  throw new Error("GMAIL_OAUTH_REDIRECT_URI는 로컬 HTTP callback 주소여야 합니다.");
}

const state = randomBytes(32).toString("base64url");
const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
const authorizationUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://mail.google.com/", "openid", "email"],
  state,
});

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", redirectUri);
    if (requestUrl.pathname !== callback.pathname || requestUrl.searchParams.get("state") !== state) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("OAuth callback 검증에 실패했습니다.");
      return;
    }
    const code = requestUrl.searchParams.get("code");
    if (!code) throw new Error(requestUrl.searchParams.get("error") ?? "GOOGLE_AUTHORIZATION_FAILED");
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);
    const tokenInfo = tokens.access_token ? await oauth.getTokenInfo(tokens.access_token) : null;
    if (!tokens.refresh_token) throw new Error("refresh token이 발급되지 않았습니다. 기존 권한을 회수한 뒤 다시 시도하세요.");
    if (tokenInfo?.email?.toLowerCase() !== smtpUser) throw new Error("동의한 Google 계정이 GMAIL_SMTP_USER와 다릅니다.");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<p>Gmail SMTP 권한을 확인했습니다. 터미널에서 refresh token을 복사한 뒤 이 창을 닫으세요.</p>");
    console.log(`GMAIL_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    server.close();
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Gmail OAuth 권한 발급에 실패했습니다. 터미널 로그를 확인하세요.");
    console.error("gmail_oauth_authorization_failed");
    server.close();
    process.exitCode = 1;
  }
});

server.listen(Number(callback.port || "80"), callback.hostname, () => {
  console.log("다음 URL을 브라우저에서 열어 Gmail 발송 계정으로 동의하세요:");
  console.log(authorizationUrl);
});
