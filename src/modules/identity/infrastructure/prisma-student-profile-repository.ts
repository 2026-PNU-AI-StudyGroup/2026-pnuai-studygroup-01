import type { StudentProfileRepository } from "@/modules/identity/application/manage-student-profile";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import type { PrismaClient } from "@/generated/prisma/client";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaStudentProfileRepository implements StudentProfileRepository {
  constructor(private readonly client: PrismaClient) {}

  find(userId: string): Promise<StudentProfile | null> {
    return this.client.studentProfile.findUnique({
      where: { userId },
      select: { interests: true, skills: true, desiredRole: true, availability: true, bio: true },
    });
  }

  async save(userId: string, profile: StudentProfile): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      await transaction.studentProfile.upsert({
        where: { userId },
        update: profile,
        create: { userId, ...profile },
      });
      await enqueueTranslations(transaction, [
        ...profile.interests,
        ...profile.skills,
        profile.desiredRole,
        profile.availability,
        profile.bio,
      ]);
    });
  }
}
