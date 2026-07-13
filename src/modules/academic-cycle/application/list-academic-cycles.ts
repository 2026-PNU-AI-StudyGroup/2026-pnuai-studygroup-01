import type {
  AcademicCycleLister,
  AcademicCycleRecord,
} from "@/modules/academic-cycle/application/academic-cycle-ports";

export class ListAcademicCyclesService {
  constructor(private readonly repository: AcademicCycleLister) {}

  execute(): Promise<AcademicCycleRecord[]> {
    return this.repository.listAll();
  }
}
