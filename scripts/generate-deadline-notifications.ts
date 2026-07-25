import "dotenv/config";

import { GenerateDeadlineNotificationsService } from "../src/modules/notification/application/manage-notifications";
import { PrismaDeadlineNotificationGenerator } from "../src/modules/notification/infrastructure/prisma-deadline-notification-generator";
import { prisma } from "../src/shared/infrastructure/database/prisma";

new GenerateDeadlineNotificationsService(new PrismaDeadlineNotificationGenerator(prisma))
  .execute()
  .then((created) => console.log(JSON.stringify({ created })))
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
