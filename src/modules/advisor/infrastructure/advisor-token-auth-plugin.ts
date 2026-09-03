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
              invitation: {
                select: {
                  programId: true,
                  revokedAt: true,
                  user: { select: { id: true, role: true, accountStatus: true } },
                },
              },
            },
          });
          // 초대를 거둔 뒤에도 링크가 살아 있으면 회수가 회수가 아니게 된다. 링크와 초대를 둘 다 본다.
          if (
            !record ||
            !isTokenUsable(record) ||
            record.invitation.revokedAt !== null ||
            record.invitation.user.role !== "ADVISOR" ||
            record.invitation.user.accountStatus !== "ACTIVE"
          ) {
            throw new APIError("UNAUTHORIZED", { status: "invalid" });
          }
          const invitee = record.invitation.user;
          // createSession은 databaseHooks.session.create.before(accountStatus 검사)를 그대로 탄다.
          const session = await ctx.context.internalAdapter.createSession(invitee.id);
          // 검사와 세션 생성 사이에 계정이 잠기면 훅이 생성을 거절해 세션이 비어 온다.
          // 그대로 쿠키를 만들려 들면 500 이 난다. 로그인 거절로 돌려보낸다.
          if (!session) {
            throw new APIError("UNAUTHORIZED", { status: "invalid" });
          }
          const user = await ctx.context.internalAdapter.findUserById(invitee.id);
          if (!user) {
            throw new APIError("UNAUTHORIZED", { status: "invalid" });
          }
          await setSessionCookie(ctx, { session, user });
          // 어느 프로그램에 불려 왔는지 화면이 알아야 그 프로그램으로 곧장 데려갈 수 있다.
          return ctx.json({ status: "ok", programId: record.invitation.programId });
        },
      ),
    },
  };
}
