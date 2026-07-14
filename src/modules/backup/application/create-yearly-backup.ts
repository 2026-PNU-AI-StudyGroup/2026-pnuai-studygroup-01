export type BackupArtifact = {
  id: string;
  type: "PRESENTATION_VIDEO" | "SOURCE_CODE" | "POSTER" | "OTHER";
  title: string;
  externalUrl?: string;
  file?: {
    objectKey: string;
    originalName: string;
    contentType: string;
    size: number;
    sha256: string;
  };
};

export type BackupProject = {
  id: string;
  term: "FIRST" | "SECOND";
  teamName: string;
  topicTitle: string;
  topicDescription: string;
  professorName: string;
  memberNames: string[];
  artifacts: BackupArtifact[];
};

export interface YearlyBackupCatalog {
  listClosedProjects(academicYear: number): Promise<BackupProject[]>;
}

export interface YearlyBackupWriter {
  write(input: {
    academicYear: number;
    createdAt: Date;
    projects: BackupProject[];
  }): Promise<{ directory: string; fileCount: number }>;
}

export class InvalidAcademicYearError extends Error {
  constructor() {
    super("학년도는 2000부터 2100 사이의 정수여야 합니다.");
    this.name = "InvalidAcademicYearError";
  }
}

export class CreateYearlyBackupService {
  constructor(
    private readonly catalog: YearlyBackupCatalog,
    private readonly writer: YearlyBackupWriter,
  ) {}

  async execute(academicYear: number, createdAt = new Date()) {
    if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 2100) {
      throw new InvalidAcademicYearError();
    }
    const projects = await this.catalog.listClosedProjects(academicYear);
    const output = await this.writer.write({ academicYear, createdAt, projects });
    return { ...output, projectCount: projects.length };
  }
}
