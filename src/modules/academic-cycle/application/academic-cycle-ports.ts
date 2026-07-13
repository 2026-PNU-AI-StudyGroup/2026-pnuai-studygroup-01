import type { AcademicCycleIdentity } from "@/modules/academic-cycle/domain/academic-cycle";

export type AcademicCycleRecord = AcademicCycleIdentity & {
  id: string;
};

export interface AcademicCycleCreator {
  create(cycle: AcademicCycleIdentity): Promise<AcademicCycleRecord>;
}

export interface AcademicCycleReader {
  exists(id: string): Promise<boolean>;
}
