import "dotenv/config";

import { GenerateDeadlineNotificationsService } from "../src/modules/notification/application/manage-notifications";
import { PrismaNotificationRepository } from "../src/modules/notification/infrastructure/prisma-notification-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

new GenerateDeadlineNotificationsService(new PrismaNotificationRepository(prisma))
  .execute()
  .then((created) => console.log(JSON.stringify({ created })))
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
