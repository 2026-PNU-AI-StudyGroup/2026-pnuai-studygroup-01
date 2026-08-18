import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export type AnnouncementVisibility = "AUTHENTICATED" | "TARGET_MEMBERS";

export type AnnouncementAttachmentRecord = {
  fileId: string;
  originalName: string;
  contentType: string;
  size: number;
  position: number;
};

export type AnnouncementRecord = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  visibility: AnnouncementVisibility;
  pinned: boolean;
  teamId: string | null;
  teamName: string | null;
  projectId: string | null;
  programId: string | null;
  programName: string | null;
  createdAt: Date;
  updatedAt: Date;
  attachments: AnnouncementAttachmentRecord[];
};

export type AnnouncementPage = {
  items: AnnouncementRecord[];
  page: number;
  total: number;
  totalPages: number;
};

export type AnnouncementWriteInput = {
  title: string;
  content: string;
  visibility: AnnouncementVisibility;
  pinned: boolean;
  teamId: string | null;
  programId: string | null;
  retainedAttachmentIds: string[];
  newAttachmentUploadIds: string[];
};

// 공지 수신 대상. ADMIN은 전체 열람, 그 외는 전체 공지 + 본인 소속(팀·프로그램) + 본인 작성분만.
export type AnnouncementAudience = {
  role: UserRole;
  actorId: string;
  teamIds: string[];
  programIds: string[];
};

export type AnnouncementMutationOutcome =
  | "UPDATED"
  | "DELETED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_ATTACHMENTS";

export type AnnouncementCreateOutcome = AnnouncementRecord | "INVALID_ATTACHMENTS";

export interface AnnouncementRepository {
  listSystem(audience: AnnouncementAudience, page: number, pageSize: number): Promise<AnnouncementPage>;
  listForProgram(audience: AnnouncementAudience, programId: string): Promise<AnnouncementRecord[]>;
  listForTeam(audience: AnnouncementAudience, teamId: string): Promise<AnnouncementRecord[]>;
  findById(id: string): Promise<AnnouncementRecord | null>;
  create(
    actor: CurrentActor,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementCreateOutcome>;
  update(
    actor: CurrentActor,
    id: string,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementMutationOutcome>;
  delete(
    actor: CurrentActor,
    id: string,
  ): Promise<AnnouncementMutationOutcome>;
}
