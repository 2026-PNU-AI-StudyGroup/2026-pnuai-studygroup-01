import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  isPusanEmail,
  normalizeEmail,
} from "../src/modules/identity/domain/user-role";

const connectionString = process.env.DATABASE_URL;
const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;

if (!connectionString) {
  throw new Error("DATABASE_URL 환경변수가 필요합니다.");
}

if (!initialAdminEmail || !isPusanEmail(initialAdminEmail)) {
  throw new Error("INITIAL_ADMIN_EMAIL에 부산대학교 이메일이 필요합니다.");
}

const normalizedAdminEmail = normalizeEmail(initialAdminEmail);
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function bootstrapAdmin() {
  const result = await prisma.user.updateMany({
    where: {
      email: normalizedAdminEmail,
      emailVerified: true,
    },
    data: {
      role: "ADMIN",
    },
  });

  if (result.count !== 1) {
    throw new Error(
      `${normalizedAdminEmail} 계정이 없습니다. 해당 계정으로 먼저 로그인한 후 다시 실행하세요.`,
    );
  }

  console.log(`${normalizedAdminEmail} 계정의 관리자 bootstrap 완료`);
}

bootstrapAdmin()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
