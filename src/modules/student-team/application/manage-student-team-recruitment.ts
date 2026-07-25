import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { normalizeApplicationMessage, normalizeApplicationProfile } from "@/modules/topic-application/domain/topic-application-policy";

export type StudentTeamRecruitmentPostView = {
  id: string; teamId: string; teamName: string; topicTitle: string; authorId: string; authorName: string;
  title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string;
  memberCount: number; capacity: number; createdAt: Date; canApply: boolean;
  ownApplication: { status: "PENDING" | "ACCEPTED" | "REJECTED" } | null;
};

export type StudentTeamRecruitmentPostList = {
  posts: StudentTeamRecruitmentPostView[];
  page: number; totalPages: number; total: number;
};

export type StudentTeamAuthoredRecruitmentPost = {
  id: string; teamName: string; topicTitle: string; title: string; status: "OPEN" | "CLOSED";
  memberCount: number; capacity: number; applicationCount: number; pendingApplicationCount: number; createdAt: Date;
};

export type StudentTeamRecruitmentApplication = {
  id: string; studentName: string; message: string; skills: string[]; desiredRole: string; availability: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED"; createdAt: Date; decidedAt: Date | null;
};

export type StudentTeamRecruitmentPostApplications = {
  id: string; teamName: string; topicTitle: string; title: string; content: string; status: "OPEN" | "CLOSED";
  applications: StudentTeamRecruitmentApplication[];
};

export type StudentTeamRecruitmentHistory = {
  id: string; postTitle: string; teamName: string; topicTitle: string; recruiterName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED"; createdAt: Date; decidedAt: Date | null;
};

export interface StudentTeamRecruitmentRepository {
  listPosts(actorId: string, page: number): Promise<StudentTeamRecruitmentPostList>;
  listLeaderTeams(actorId: string): Promise<Array<{ id: string; name: string; memberCount: number }>>;
  listAuthoredPosts(actorId: string, page: number): Promise<{ posts: StudentTeamAuthoredRecruitmentPost[]; page: number; totalPages: number; total: number }>;
  listApplicationHistory(actorId: string, page: number): Promise<{ applications: StudentTeamRecruitmentHistory[]; page: number; totalPages: number; total: number }>;
  findPostApplications(postId: string, actorId: string, isAdmin: boolean): Promise<StudentTeamRecruitmentPostApplications | null>;
  createPost(input: { teamId: string; leaderId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string; capacity: number }): Promise<boolean>;
  apply(input: { postId: string; studentId: string; message: string; skills: string[]; desiredRole: string; availability: string; appliedAt: Date }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_MEMBER">;
  decide(input: { applicationId: string; actorId: string; isAdmin: boolean; decision: "ACCEPT" | "REJECT"; decidedAt: Date }): Promise<"ACCEPTED" | "REJECTED" | "UNAVAILABLE" | "FORBIDDEN">;
}

export class StudentTeamRecruitmentError extends Error {}

function assertStudent(actor: CurrentUser) {
  if (actor.role !== "STUDENT") throw new StudentTeamRecruitmentError("학생만 팀원 찾기 기능을 사용할 수 있습니다.");
}

function text(value: string, max: number, label: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new StudentTeamRecruitmentError(`${label}을 확인해 주세요.`);
  return normalized;
}

export class StudentTeamRecruitmentService {
  constructor(private readonly repository: StudentTeamRecruitmentRepository, private readonly now: () => Date = () => new Date()) {}

  listPosts(actor: CurrentUser, page = 1) { assertStudent(actor); return this.repository.listPosts(actor.id, page); }
  listLeaderTeams(actor: CurrentUser) { assertStudent(actor); return this.repository.listLeaderTeams(actor.id); }
  listAuthoredPosts(actor: CurrentUser, page = 1) { assertStudent(actor); return this.repository.listAuthoredPosts(actor.id, page); }
  listApplicationHistory(actor: CurrentUser, page = 1) { assertStudent(actor); return this.repository.listApplicationHistory(actor.id, page); }

  getPostApplications(actor: CurrentUser, postId: string) {
    if (actor.role !== "STUDENT" && actor.role !== "ADMIN") throw new StudentTeamRecruitmentError("모집 지원자를 검토할 권한이 없습니다.");
    return this.repository.findPostApplications(postId, actor.id, actor.role === "ADMIN");
  }

  async createPost(actor: CurrentUser, input: { teamId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string; capacity: number }) {
    assertStudent(actor);
    const requiredSkills = [...new Set(input.requiredSkills.map((value) => value.trim()).filter(Boolean))];
    if (!requiredSkills.length || requiredSkills.length > 20 || requiredSkills.some((value) => value.length > 50)) throw new StudentTeamRecruitmentError("필요 기술을 확인해 주세요.");
    if (!Number.isSafeInteger(input.capacity) || input.capacity < 2 || input.capacity > 100) throw new StudentTeamRecruitmentError("목표 팀원 수를 확인해 주세요.");
    const created = await this.repository.createPost({
      teamId: input.teamId, leaderId: actor.id, capacity: input.capacity, requiredSkills,
      title: text(input.title, 200, "제목"), content: text(input.content, 2_000, "내용"),
      roleNeeded: text(input.roleNeeded, 500, "역할"), availability: text(input.availability, 500, "활동 가능 시간"),
    });
    if (!created) throw new StudentTeamRecruitmentError("팀장만 현재 인원보다 큰 목표 인원으로 모집할 수 있습니다.");
  }

  async apply(actor: CurrentUser, input: { postId: string; message: string; skills: string[]; desiredRole: string; availability: string }) {
    assertStudent(actor);
    let profile: ReturnType<typeof normalizeApplicationProfile>;
    let message: string;
    try { profile = normalizeApplicationProfile(input); message = normalizeApplicationMessage(input.message); }
    catch { throw new StudentTeamRecruitmentError("지원 내용과 프로필 정보를 확인해 주세요."); }
    const result = await this.repository.apply({ postId: input.postId, studentId: actor.id, message, ...profile, appliedAt: this.now() });
    if (result !== "CREATED") throw new StudentTeamRecruitmentError(result === "ALREADY_MEMBER" ? "이미 이 팀의 팀원입니다." : result === "ALREADY_APPLIED" ? "이미 지원한 모집입니다." : "현재 지원할 수 없는 모집입니다.");
  }

  async decide(actor: CurrentUser, applicationId: string, decision: "ACCEPT" | "REJECT") {
    const result = await this.repository.decide({ applicationId, actorId: actor.id, isAdmin: actor.role === "ADMIN", decision, decidedAt: this.now() });
    if (result !== "ACCEPTED" && result !== "REJECTED") throw new StudentTeamRecruitmentError(result === "FORBIDDEN" ? "팀장만 지원자를 결정할 수 있습니다." : "팀 인원 또는 지원 상태가 변경되었습니다.");
  }
}
