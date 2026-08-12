import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";

import { Prisma } from "@/generated/prisma/client";
import {
  canProvisionInstitutionUser,
  normalizeEmail,
  USER_ROLES,
} from "@/modules/identity/domain/user-role";
import { parseAuthEnvironment } from "@/modules/identity/infrastructure/auth-environment";
import { isDevelopmentMockAuthEnabled } from "@/modules/identity/infrastructure/development-mock-auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

const authEnvironment = parseAuthEnvironment(process.env);
const developmentMockAuthEnabled = isDevelopmentMockAuthEnabled({
  nodeEnv: authEnvironment.NODE_ENV,
  explicitlyEnabled: authEnvironment.ENABLE_DEVELOPMENT_MOCK_AUTH,
});

async function reconcileProfessorRole(userId: string): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });
    if (!user || user.role === "ADMIN") return;
    const email = normalizeEmail(user.email);
    await transaction.$queryRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))::text AS "lock"
    `);
    const professorEntry = await transaction.professorAllowlist.findFirst({
      where: { email, revokedAt: null },
      select: { id: true },
    });
    await transaction.user.updateMany({
      where: { id: userId, role: { not: "ADMIN" } },
      // 교수로 지정되면 학생 온보딩 요구를 해제한다. 이 값이 남아 있으면
      // 이후 관리자가 권한을 회수해 STUDENT로 강등할 때 온보딩 폼에 갇힌다.
      data: professorEntry
        ? { role: "PROFESSOR", onboardingRequired: false }
        : { role: "STUDENT" },
    });
  });
}

export const auth = betterAuth({
  appName: "PNU 프로젝트 관리 시스템",
  baseURL: authEnvironment.BETTER_AUTH_URL,
  secret: authEnvironment.BETTER_AUTH_SECRET,
  advanced: {
    // 목 인증 개발 배포는 http 터널로도 접근하는데, https baseURL이면 better-auth가
    // 세션 쿠키에 `__Secure-` 접두사를 붙여 브라우저가 http에서 거부한다. 목 인증일 때만
    // Secure 쿠키를 끈다. 실제 운영(목 인증 off)은 https 기준 Secure 쿠키를 유지한다.
    useSecureCookies: !developmentMockAuthEnabled,
  },
  // 목 인증 개발 배포는 http 터널(localhost)로 접근하는데, better-auth는 요청 origin을
  // baseURL과 대조해 로그아웃 등 정식 엔드포인트를 막는다. 목 인증일 때만 localhost origin을
  // 신뢰 목록에 더한다. 실제 운영(목 인증 off)은 기본값(baseURL)만 신뢰한다.
  trustedOrigins: developmentMockAuthEnabled
    ? (request?: Request) => {
        const origins = [authEnvironment.BETTER_AUTH_URL];
        const origin = request?.headers.get("origin");
        if (origin) {
          try {
            const hostname = new URL(origin).hostname;
            if (["localhost", "127.0.0.1", "::1"].includes(hostname)) origins.push(origin);
          } catch {
            // 잘못된 origin 헤더는 무시
          }
        }
        return origins;
      }
    : undefined,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  account: {
    encryptOAuthTokens: true,
  },
  user: {
    additionalFields: {
      role: {
        type: [...USER_ROLES],
        required: true,
        defaultValue: "STUDENT",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
      department: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
      studentNumber: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
      grade: {
        type: "number",
        required: false,
        input: false,
        returned: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
      contactEmail: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
      onboardingRequired: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      onboardingCompletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  socialProviders: developmentMockAuthEnabled
    ? {}
    : {
        google: {
          clientId: authEnvironment.GOOGLE_CLIENT_ID!,
          clientSecret: authEnvironment.GOOGLE_CLIENT_SECRET!,
          hd: "pusan.ac.kr",
          prompt: "select_account",
        },
      },
  plugins: developmentMockAuthEnabled ? [testUtils()] : [],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!canProvisionInstitutionUser(user.email, user.emailVerified)) {
            return false;
          }

          return {
            data: {
              ...user,
              email: normalizeEmail(user.email),
              role: "STUDENT",
              onboardingRequired: true,
            },
          };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          await reconcileProfessorRole(session.userId);
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
          if (!user?.isActive) return false;
        },
      },
    },
  },
});
