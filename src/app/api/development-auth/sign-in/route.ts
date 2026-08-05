import type { TestHelpers } from "better-auth/plugins";
import { NextResponse } from "next/server";

import { auth } from "@/modules/identity/infrastructure/auth";
import {
  canUseDevelopmentMockAuth,
  DEVELOPMENT_MOCK_ACCOUNTS,
  getDevelopmentMockAuthOrigin,
  isUserRole,
} from "@/modules/identity/infrastructure/development-mock-auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function POST(request: Request) {
  const requestPolicy = {
    nodeEnv: process.env.NODE_ENV,
    explicitlyEnabled: process.env.ENABLE_DEVELOPMENT_MOCK_AUTH,
    allowedHostnames: process.env.DEVELOPMENT_MOCK_AUTH_HOSTS,
    requestUrl: request.url,
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  };
  if (!canUseDevelopmentMockAuth(requestPolicy)) {
    return new Response(null, { status: 404 });
  }
  const externalOrigin = getDevelopmentMockAuthOrigin(requestPolicy);
  if (!externalOrigin) return new Response(null, { status: 404 });
  const externalUrl = new URL(externalOrigin);

  const formData = await request.formData();
  const requestedRole = formData.get("role");
  if (typeof requestedRole !== "string" || !isUserRole(requestedRole)) {
    return NextResponse.json({ message: "지원하지 않는 데모 계정 역할입니다." }, { status: 400 });
  }

  const account = DEVELOPMENT_MOCK_ACCOUNTS[requestedRole];
  const user = await prisma.user.findFirst({
    where: { id: account.id, role: requestedRole, isActive: true },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.redirect(new URL("/?mockLogin=seed-required", externalOrigin), 303);
  }

  const context = await auth.$context as Awaited<typeof auth.$context> & { test?: TestHelpers };
  if (!context.test) {
    return new Response(null, { status: 404 });
  }
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const login = await context.test.login({ userId: user.id });
  const response = NextResponse.redirect(new URL("/topics", externalOrigin), 303);
  for (const cookie of login.cookies) {
    const cookieDomain = cookie.domain?.replace(/^\./, "");
    const domainMatches = cookieDomain
      && (externalUrl.hostname === cookieDomain || externalUrl.hostname.endsWith(`.${cookieDomain}`));
    response.cookies.set(cookie.name, cookie.value, {
      domain: domainMatches ? cookie.domain : undefined,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: externalUrl.protocol === "https:" ? cookie.secure : false,
      sameSite: cookie.sameSite?.toLowerCase() as "lax" | "strict" | "none" | undefined,
      expires: cookie.expires ? new Date(cookie.expires * 1000) : undefined,
    });
  }
  return response;
}
