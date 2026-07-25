import type { TestHelpers } from "better-auth/plugins";
import { NextResponse } from "next/server";

import { auth } from "@/modules/identity/infrastructure/auth";
import { canUseDevelopmentMockAuth, DEVELOPMENT_MOCK_ACCOUNTS, isUserRole } from "@/modules/identity/infrastructure/development-mock-auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function POST(request: Request) {
  if (!canUseDevelopmentMockAuth({ nodeEnv: process.env.NODE_ENV, requestUrl: request.url, origin: request.headers.get("origin") })) {
    return new Response(null, { status: 404 });
  }

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
    return NextResponse.redirect(new URL("/sign-in?mockLogin=seed-required", request.url), 303);
  }

  const context = await auth.$context as Awaited<typeof auth.$context> & { test?: TestHelpers };
  if (!context.test) {
    return new Response(null, { status: 404 });
  }
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const login = await context.test.login({ userId: user.id });
  const response = NextResponse.redirect(new URL("/topics", request.url), 303);
  for (const cookie of login.cookies) {
    response.cookies.set(cookie.name, cookie.value, {
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite?.toLowerCase() as "lax" | "strict" | "none" | undefined,
      expires: cookie.expires ? new Date(cookie.expires * 1000) : undefined,
    });
  }
  return response;
}
