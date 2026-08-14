import "dotenv/config";

import { prisma } from "../src/shared/infrastructure/database/prisma";

prisma.emailDelivery.updateMany({
  where: { status: "FAILED" },
  data: { status: "PENDING", attempts: 0, availableAt: new Date(), lockedAt: null, lastError: null },
})
  .then(({ count }) => console.log(JSON.stringify({ requeued: count })))
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
