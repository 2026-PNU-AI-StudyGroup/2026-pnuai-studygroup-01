import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

import { hashAdvisorToken, isTokenUsable } from "@/modules/advisor/domain/advisor-access-token";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 초대 토큰을 검증해 자문위원 세션을 발급하는 better-auth 플러그인.
export function advisorTokenAuth(): BetterAuthPlugin {
  return {
    id: "advisor-token-auth",
    endpoints: {
      advisorSignIn: createAuthEndpoint(
        "/advisor-token/sign-in",
        { method: "POST", body: z.object({ token: z.string().min(20) }) },
        async (ctx) => {
          const tokenHash = hashAdvisorToken(ctx.body.token);
          const record = await prisma.advisorAccessToken.findUnique({
            where: { tokenHash },
            select: {
              expiresAt: true,
              revokedAt: true,
              user: { select: { id: true, role: true, isActive: true } },
            },
          });
          if (
            !record ||
            !isTokenUsable(record) ||
            record.user.role !== "ADVISOR" ||
            !record.user.isActive
          ) {
            throw new APIError("UNAUTHORIZED", { status: "invalid" });
          }
          // createSession은 databaseHooks.session.create.before(isActive 검사)를 그대로 탄다.
          const session = await ctx.context.internalAdapter.createSession(record.user.id);
          const user = await ctx.context.internalAdapter.findUserById(record.user.id);
          if (!user) {
            throw new APIError("UNAUTHORIZED", { status: "invalid" });
          }
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ status: "ok" });
        },
      ),
    },
  };
}
