import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaUserAdministrationRepository } from "../src/modules/identity/infrastructure/prisma-user-administration-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_USER_ADMIN_TEST !== "true") {
  throw new Error("ALLOW_LOCAL_USER_ADMIN_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.");
}

const firstAdminId = randomUUID();
const secondAdminId = randomUUID();
const verificationUserIds = [firstAdminId, secondAdminId];

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { actorId: { in: verificationUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: verificationUserIds } } });
}

async function main() {
  await prisma.user.createMany({ data: [
    {
      id: firstAdminId,
      name: "Concurrent Admin A",
      email: `verification+${firstAdminId}@pusan.ac.kr`,
      emailVerified: true,
      role: "ADMIN",
    },
    {
      id: secondAdminId,
      name: "Concurrent Admin B",
      email: `verification+${secondAdminId}@pusan.ac.kr`,
      emailVerified: true,
      role: "ADMIN",
    },
  ] });

  const repository = new PrismaUserAdministrationRepository(prisma);
  const outcomes = await Promise.all([
    repository.setActive({ actorId: firstAdminId, targetId: secondAdminId, isActive: false, changedAt: new Date() }),
    repository.setActive({ actorId: secondAdminId, targetId: firstAdminId, isActive: false, changedAt: new Date() }),
  ]);
  const activeAdmins = await prisma.user.count({
    where: { id: { in: verificationUserIds }, role: "ADMIN", isActive: true },
  });
  const sortedOutcomes = [...outcomes].sort();
  if (activeAdmins !== 1 || sortedOutcomes.join(",") !== "LAST_ADMIN,UPDATED") {
    throw new Error(`마지막 활성 관리자 불변식이 깨졌습니다: active=${activeAdmins}, outcomes=${outcomes.join(",")}`);
  }

  console.log(JSON.stringify({ activeAdmins, outcomes: sortedOutcomes }));
}

main()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
