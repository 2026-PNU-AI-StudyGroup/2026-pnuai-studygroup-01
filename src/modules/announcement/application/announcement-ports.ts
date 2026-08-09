import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export type AnnouncementCategory = "GENERAL" | "HACKATHON" | "GRADUATION_PROJECT";

export type AnnouncementRecord = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  category: AnnouncementCategory;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  category: AnnouncementCategory;
  pinned: boolean;
};

export type AnnouncementMutationOutcome =
  | "UPDATED"
  | "DELETED"
  | "NOT_FOUND"
  | "FORBIDDEN";

export interface AnnouncementRepository {
  list(page: number, pageSize: number, category?: AnnouncementCategory): Promise<AnnouncementPage>;
  findById(id: string): Promise<AnnouncementRecord | null>;
  create(
    authorId: string,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementRecord>;
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
