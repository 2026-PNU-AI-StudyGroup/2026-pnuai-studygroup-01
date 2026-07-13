import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import {
  canProvisionInstitutionUser,
  determineInitialRole,
  normalizeEmail,
  USER_ROLES,
} from "@/modules/identity/domain/user-role";
import { parseAuthEnvironment } from "@/modules/identity/infrastructure/auth-environment";
import { prisma } from "@/shared/infrastructure/database/prisma";

const authEnvironment = parseAuthEnvironment(process.env);

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
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!canProvisionInstitutionUser(user.email, user.emailVerified)) {
            return false;
          }

          const email = normalizeEmail(user.email);
          const professorEntry = await prisma.professorAllowlist.findFirst({
            where: {
              email,
              revokedAt: null,
            },
            select: { id: true },
          });

          return {
            data: {
              ...user,
              email,
              role: determineInitialRole({
                isProfessorAllowlisted: professorEntry !== null,
              }),
            },
          };
        },
      },
    },
  },
});
