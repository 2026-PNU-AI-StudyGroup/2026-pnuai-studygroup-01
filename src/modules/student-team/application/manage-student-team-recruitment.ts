import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { normalizeApplicationMessage } from "@/modules/topic-application/domain/topic-application-policy";

type StudentTeamRecruitmentPostView = {
  id: string; teamId: string; teamName: string; topicTitle: string; authorId: string; authorName: string;
  title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string;
  memberCount: number; capacity: number; createdAt: Date; deadlineAt: Date; canApply: boolean; isMember: boolean;
  ownApplication: { status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" } | null;
};

export type StudentTeamRecruitmentPostList = {
  posts: StudentTeamRecruitmentPostView[];
  page: number; totalPages: number; total: number;
};

type StudentTeamAuthoredRecruitmentPost = {
  id: string; teamName: string; topicTitle: string; title: string; status: "OPEN" | "CLOSED";
  memberCount: number; capacity: number; applicationCount: number; pendingApplicationCount: number; createdAt: Date; deadlineAt: Date;
};

type StudentTeamRecruitmentApplication = {
  id: string; studentName: string; message: string; desiredRole: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "CLOSED"; createdAt: Date; decidedAt: Date | null;
};

export type StudentTeamRecruitmentPostApplications = {
  id: string; teamName: string; topicTitle: string; title: string; content: string; status: "OPEN" | "CLOSED";
  applications: StudentTeamRecruitmentApplication[];
};

type StudentTeamRecruitmentHistory = {
  id: string; postTitle: string; teamName: string; topicTitle: string; recruiterName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "CLOSED"; createdAt: Date; decidedAt: Date | null;
};

export interface StudentTeamRecruitmentReader {
  listPosts(actorId: string, page: number): Promise<StudentTeamRecruitmentPostList>;
  listLeaderTeams(actorId: string): Promise<Array<{
    id: string;
    name: string;
    memberCount: number;
    pendingInvitationCount: number;
    members: Array<{ id: string; name: string }>;
  }>>;
  listAuthoredPosts(actorId: string, page: number): Promise<{ posts: StudentTeamAuthoredRecruitmentPost[]; page: number; totalPages: number; total: number }>;
  listApplicationHistory(actorId: string, page: number): Promise<{ applications: StudentTeamRecruitmentHistory[]; page: number; totalPages: number; total: number }>;
  findPostApplications(postId: string, actorId: string, isAdmin: boolean): Promise<StudentTeamRecruitmentPostApplications | null>;
}

export interface StudentTeamRecruitmentWriter {
  createPost(input: { teamId: string; leaderId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string; capacity: number; deadlineAt: Date; createdAt: Date }): Promise<boolean>;
  apply(input: { postId: string; studentId: string; message: string; desiredRole: string; appliedAt: Date }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_MEMBER">;
  decide(input: { applicationId: string; actorId: string; isAdmin: boolean; decision: "ACCEPT" | "REJECT"; decidedAt: Date }): Promise<"ACCEPTED" | "REJECTED" | "UNAVAILABLE" | "FORBIDDEN">;
  closePost?(input: { postId: string; leaderId: string; closedAt: Date }): Promise<boolean>;
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

export class StudentTeamRecruitmentQueryService {
  constructor(private readonly reader: StudentTeamRecruitmentReader) {}

  listPosts(actor: CurrentUser, page = 1) { assertStudent(actor); return this.reader.listPosts(actor.id, page); }
  listLeaderTeams(actor: CurrentUser) { assertStudent(actor); return this.reader.listLeaderTeams(actor.id); }
  listAuthoredPosts(actor: CurrentUser, page = 1) { assertStudent(actor); return this.reader.listAuthoredPosts(actor.id, page); }
  listApplicationHistory(actor: CurrentUser, page = 1) { assertStudent(actor); return this.reader.listApplicationHistory(actor.id, page); }

  getPostApplications(actor: CurrentUser, postId: string) {
    if (actor.role !== "STUDENT" && actor.role !== "ADMIN") throw new StudentTeamRecruitmentError("모집 지원자를 검토할 권한이 없습니다.");
    return this.reader.findPostApplications(postId, actor.id, actor.role === "ADMIN");
  }
}

export class StudentTeamRecruitmentCommandService {
  constructor(
    private readonly writer: StudentTeamRecruitmentWriter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createPost(actor: CurrentUser, input: { teamId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string; capacity: number; deadlineAt: Date }) {
    assertStudent(actor);
    const createdAt = this.now();
    const requiredSkills = [...new Set(input.requiredSkills.map((value) => value.trim()).filter(Boolean))];
    if (!requiredSkills.length || requiredSkills.length > 20 || requiredSkills.some((value) => value.length > 50)) throw new StudentTeamRecruitmentError("필요 기술을 확인해 주세요.");
    if (!Number.isSafeInteger(input.capacity) || input.capacity < 2 || input.capacity > 100) throw new StudentTeamRecruitmentError("팀 정원을 확인해 주세요.");
    if (!Number.isFinite(input.deadlineAt.getTime()) || input.deadlineAt <= createdAt || input.deadlineAt > oneMonthAfter(createdAt)) {
      throw new StudentTeamRecruitmentError("모집 마감은 등록 시점부터 최대 1개월 안에서 정해 주세요.");
    }
    const created = await this.writer.createPost({
      teamId: input.teamId, leaderId: actor.id, capacity: input.capacity, requiredSkills, deadlineAt: input.deadlineAt, createdAt,
      title: text(input.title, 200, "제목"), content: text(input.content, 2_000, "내용"),
      roleNeeded: text(input.roleNeeded, 500, "역할"), availability: text(input.availability, 500, "활동 가능 시간"),
    });
    if (!created) throw new StudentTeamRecruitmentError("팀장만 현재 인원보다 큰 팀 정원을 설정해 모집할 수 있습니다.");
  }

  async apply(actor: CurrentUser, input: { postId: string; message: string; desiredRole: string }) {
    assertStudent(actor);
    let desiredRole: string;
    let message: string;
    try { desiredRole = text(input.desiredRole, 500, "희망 역할"); message = normalizeApplicationMessage(input.message); }
    catch { throw new StudentTeamRecruitmentError("입력값을 확인해 주세요."); }
    const result = await this.writer.apply({ postId: input.postId, studentId: actor.id, message, desiredRole, appliedAt: this.now() });
    if (result !== "CREATED") throw new StudentTeamRecruitmentError(result === "ALREADY_MEMBER" ? "이미 이 팀의 팀원입니다." : result === "ALREADY_APPLIED" ? "이미 지원한 모집입니다." : "현재 지원할 수 없는 모집입니다.");
  }

  async decide(actor: CurrentUser, applicationId: string, decision: "ACCEPT" | "REJECT") {
    const result = await this.writer.decide({ applicationId, actorId: actor.id, isAdmin: actor.role === "ADMIN", decision, decidedAt: this.now() });
    if (result !== "ACCEPTED" && result !== "REJECTED") throw new StudentTeamRecruitmentError(result === "FORBIDDEN" ? "팀장만 팀원 지원을 처리할 수 있습니다." : "팀 인원 또는 지원 상태가 변경되었습니다.");
  }

  async closePost(actor: CurrentUser, postId: string) {
    assertStudent(actor);
    if (!this.writer.closePost || !(await this.writer.closePost({ postId, leaderId: actor.id, closedAt: this.now() }))) {
      throw new StudentTeamRecruitmentError("팀장만 모집 중인 공고를 종료할 수 있습니다.");
    }
  }
}

function oneMonthAfter(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
