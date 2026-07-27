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
import { prisma } from "@/shared/infrastructure/database/prisma";

const authEnvironment = parseAuthEnvironment(process.env);

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
      data: { role: professorEntry ? "PROFESSOR" : "STUDENT" },
    });
  });
}

export const auth = betterAuth({
  appName: "PNU 프로젝트 관리 시스템",
  baseURL: authEnvironment.BETTER_AUTH_URL,
  secret: authEnvironment.BETTER_AUTH_SECRET,
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
  socialProviders: {
    google: {
      clientId: authEnvironment.GOOGLE_CLIENT_ID,
      clientSecret: authEnvironment.GOOGLE_CLIENT_SECRET,
      hd: "pusan.ac.kr",
      prompt: "select_account",
    },
  },
  plugins: authEnvironment.NODE_ENV === "development" ? [testUtils()] : [],
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
