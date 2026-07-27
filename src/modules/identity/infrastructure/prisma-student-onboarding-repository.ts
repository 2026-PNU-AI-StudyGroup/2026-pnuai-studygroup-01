import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { StudentOnboardingRepository } from "@/modules/identity/application/complete-student-onboarding";
import type { StudentOnboardingProfile } from "@/modules/identity/domain/student-onboarding";

export class PrismaStudentOnboardingRepository implements StudentOnboardingRepository {
  constructor(private readonly client: PrismaClient) {}

  async complete(
    userId: string,
    profile: StudentOnboardingProfile,
    completedAt: Date,
  ): Promise<"COMPLETED" | "NOT_REQUIRED" | "STUDENT_NUMBER_TAKEN"> {
    try {
      const updated = await this.client.user.updateMany({
        where: {
          id: userId,
          role: "STUDENT",
          onboardingRequired: true,
          onboardingCompletedAt: null,
        },
        data: {
          ...profile,
          onboardingCompletedAt: completedAt,
        },
      });
      return updated.count === 1 ? "COMPLETED" : "NOT_REQUIRED";
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return "STUDENT_NUMBER_TAKEN";
      }
      throw error;
    }
  }
}
