import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicApplicationDecisionRepository } from "@/modules/topic-application/application/topic-application-ports";
import { normalizeApplicationMessage, normalizeApplicationProfile } from "@/modules/topic-application/domain/topic-application-policy";

export type RecruitmentPostView = {
  id: string; teamId: string; teamName: string; topicTitle: string; authorId: string; authorName: string;
  title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string;
  memberCount: number; capacity: number; createdAt: Date; canApply: boolean;
  ownApplication: { status: "PENDING" | "ACCEPTED" | "REJECTED" } | null;
  receivedApplications: Array<{ id: string; studentName: string; message: string; skills: string[]; desiredRole: string; availability: string; status: "PENDING" | "ACCEPTED" | "REJECTED" }>;
};

export type RecruitmentApplicationHistory = {
  id: string;
  postTitle: string;
  teamName: string;
  topicTitle: string;
  recruiterName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  decidedAt: Date | null;
};

export type RecruitmentPostListResult = {
  posts: RecruitmentPostView[];
  formingTeams: Array<{ id: string; name: string }>;
  page: number;
  totalPages: number;
  total: number;
};

export type RecruitmentApplicationHistoryPage = {
  applications: RecruitmentApplicationHistory[];
  page: number;
  totalPages: number;
  total: number;
};

export interface RecruitmentRepository {
  listPosts(actorId: string, page: number): Promise<RecruitmentPostListResult>;
  listApplicationHistory(actorId: string, page: number): Promise<RecruitmentApplicationHistoryPage>;
  listFormingTeams(actorId: string): Promise<Array<{ id: string; name: string }>>;
  createPost(input: { teamId: string; authorId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string }): Promise<boolean>;
  apply(input: { postId: string; studentId: string; message: string; skills: string[]; desiredRole: string; availability: string; appliedAt: Date }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_ASSIGNED">;
  findDecisionTarget(id: string, authorId: string): Promise<string | null>;
}

export class RecruitmentOperationError extends Error {}

function assertStudent(actor: CurrentActor) {
  if (actor.role !== "STUDENT") throw new RecruitmentOperationError("학생만 팀원 모집 기능을 사용할 수 있습니다.");
}

function normalizeText(value: string, max: number, label: string) {
  const text = value.trim();
  if (!text || text.length > max) throw new RecruitmentOperationError(`${label} 형식을 확인해 주세요.`);
  return text;
}

export class RecruitmentService {
  constructor(private readonly repository: RecruitmentRepository, private readonly decisions: TopicApplicationDecisionRepository) {}

  async listPosts(actor: CurrentActor, page = 1) {
    assertStudent(actor);
    const normalizedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    return this.repository.listPosts(actor.id, normalizedPage);
  }

  async listApplicationHistory(actor: CurrentActor, page = 1) {
    assertStudent(actor);
    const normalizedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    return this.repository.listApplicationHistory(actor.id, normalizedPage);
  }

  async listFormingTeams(actor: CurrentActor) {
    assertStudent(actor);
    return this.repository.listFormingTeams(actor.id);
  }

  async createPost(actor: CurrentActor, input: { teamId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string }) {
    assertStudent(actor);
    const requiredSkills = [...new Set(input.requiredSkills.map((skill) => skill.trim()).filter(Boolean))];
    if (!requiredSkills.length || requiredSkills.length > 20 || requiredSkills.some((skill) => skill.length > 50)) throw new RecruitmentOperationError("필요 기술 형식을 확인해 주세요.");
    const created = await this.repository.createPost({
      teamId: input.teamId, authorId: actor.id, requiredSkills,
      title: normalizeText(input.title, 200, "제목"), content: normalizeText(input.content, 2000, "내용"),
      roleNeeded: normalizeText(input.roleNeeded, 500, "필요 역할"), availability: normalizeText(input.availability, 500, "활동 가능 시간"),
    });
    if (!created) throw new RecruitmentOperationError("모집 중인 본인의 구성 단계 팀에서만 글을 작성할 수 있습니다.");
  }

  async apply(actor: CurrentActor, input: { postId: string; message: string; skills: string[]; desiredRole: string; availability: string }, now = new Date()) {
    assertStudent(actor);
    let profile: ReturnType<typeof normalizeApplicationProfile>;
    let message: string;
    try { profile = normalizeApplicationProfile(input); message = normalizeApplicationMessage(input.message); }
    catch { throw new RecruitmentOperationError("지원 메시지와 보유 기술, 희망 역할, 활동 가능 시간을 확인해 주세요."); }
    const outcome = await this.repository.apply({ postId: input.postId, studentId: actor.id, message, ...profile, appliedAt: now });
    if (outcome !== "CREATED") throw new RecruitmentOperationError(outcome === "ALREADY_APPLIED" ? "이미 지원한 모집 글입니다." : outcome === "ALREADY_ASSIGNED" ? "이미 같은 학기 팀에 소속되어 있습니다." : "현재 지원할 수 없는 모집 글입니다.");
  }

  async decide(actor: CurrentActor, id: string, decision: "ACCEPT" | "REJECT", now = new Date()) {
    assertStudent(actor);
    const topicApplicationId = await this.repository.findDecisionTarget(id, actor.id);
    if (!topicApplicationId) throw new RecruitmentOperationError("결정할 수 없는 모집 지원입니다.");
    const decisionActor = { id: actor.id, isAdmin: false };
    const outcome = decision === "ACCEPT"
      ? await this.decisions.accept(topicApplicationId, decisionActor, now)
      : await this.decisions.reject(topicApplicationId, decisionActor, now);
    if (outcome !== "ACCEPTED" && outcome !== "REJECTED") throw new RecruitmentOperationError("팀 정원 또는 지원 상태가 변경되어 처리하지 못했습니다.");
  }
}
