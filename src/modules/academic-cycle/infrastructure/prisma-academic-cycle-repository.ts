import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { AcademicCycleAlreadyExistsError } from "@/modules/academic-cycle/application/academic-cycle-errors";
import type {
  AcademicCycleCreator,
  AcademicCycleLister,
  AcademicCycleReader,
  AcademicCycleRecord,
} from "@/modules/academic-cycle/application/academic-cycle-ports";
import type { AcademicCycleIdentity } from "@/modules/academic-cycle/domain/academic-cycle";

export class PrismaAcademicCycleRepository
  implements AcademicCycleCreator, AcademicCycleReader, AcademicCycleLister
{
  constructor(private readonly client: PrismaClient) {}

  async create(cycle: AcademicCycleIdentity): Promise<AcademicCycleRecord> {
    try {
      return await this.client.academicCycle.create({
        data: cycle,
        select: {
          id: true,
          academicYear: true,
          term: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AcademicCycleAlreadyExistsError();
      }

      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    const cycle = await this.client.academicCycle.findUnique({
      where: { id },
      select: { id: true },
    });

    return cycle !== null;
  }

  listAll(): Promise<AcademicCycleRecord[]> {
    return this.client.academicCycle.findMany({
      orderBy: [{ academicYear: "desc" }, { term: "desc" }],
      select: {
        id: true,
        academicYear: true,
        term: true,
      },
    });
  }
}
