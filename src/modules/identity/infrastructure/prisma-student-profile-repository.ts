import type { StudentProfileRepository } from "@/modules/identity/application/manage-student-profile";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaStudentProfileRepository implements StudentProfileRepository {
  constructor(private readonly client: PrismaClient) {}

  find(userId: string): Promise<StudentProfile | null> {
    return this.client.studentProfile.findUnique({
      where: { userId },
      select: { phone: true, kakao: true, github: true, instagram: true },
    });
  }

  async save(userId: string, profile: StudentProfile): Promise<void> {
    await this.client.studentProfile.upsert({
      where: { userId },
      update: profile,
      create: { userId, ...profile },
    });
  }
}
