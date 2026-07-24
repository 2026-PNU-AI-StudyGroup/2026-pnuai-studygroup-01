import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicApplicationConfiguration } from "@/modules/topic-application/domain/topic-application-configuration";

export class TopicApplicationForbiddenError extends Error {
  constructor() {
    super("학생만 주제에 지원할 수 있습니다.");
    this.name = "TopicApplicationForbiddenError";
  }
}

export class InvalidTopicApplicationMessageError extends Error {
  constructor() {
    super("지원 메시지는 1자 이상 2000자 이하여야 합니다.");
    this.name = "InvalidTopicApplicationMessageError";
  }
}

export class InvalidTopicApplicationProfileError extends Error {
  constructor() {
    super("보유 기술, 희망 역할, 활동 가능 시간을 형식에 맞게 입력해 주세요.");
    this.name = "InvalidTopicApplicationProfileError";
  }
}

export class InvalidTopicApplicationAnswersError extends Error {
  constructor(message = "지원서 문항의 필수 여부와 글자 수 제한을 확인해 주세요.") {
    super(message);
    this.name = "InvalidTopicApplicationAnswersError";
  }
}

export class InvalidTeamApplicationMembersError extends Error {
  constructor(message = "팀원 이메일을 확인해 주세요.") {
    super(message);
    this.name = "InvalidTeamApplicationMembersError";
  }
}

export class TopicApplicationKindForbiddenError extends Error {
  constructor() {
    super("이 주제에서 허용하지 않는 지원 방식입니다.");
    this.name = "TopicApplicationKindForbiddenError";
  }
}

export function assertCanApplyToTopic(actor: CurrentActor): void {
  if (actor.role !== "STUDENT") {
    throw new TopicApplicationForbiddenError();
  }
}

export function normalizeApplicationMessage(message: string): string {
  const normalized = message.trim();
  if (normalized.length < 1 || normalized.length > 2_000) {
    throw new InvalidTopicApplicationMessageError();
  }
  return normalized;
}

export function normalizeApplicationProfile(input: {
  skills: string[];
  desiredRole: string;
  availability: string;
}) {
  const skills = [...new Set(input.skills.map((skill) => skill.trim()).filter(Boolean))];
  const desiredRole = input.desiredRole.trim();
  const availability = input.availability.trim();
  if (
    skills.length === 0 ||
    skills.length > 20 ||
    skills.some((skill) => skill.length > 50) ||
    desiredRole.length === 0 ||
    desiredRole.length > 500 ||
    availability.length === 0 ||
    availability.length > 500
  ) {
    throw new InvalidTopicApplicationProfileError();
  }
  return { skills, desiredRole, availability };
}

export function assertApplicationKindAllowed(
  mode: TopicApplicationConfiguration["mode"],
  kind: "INDIVIDUAL" | "TEAM",
): void {
  if (
    (mode === "TEAM_ONLY" && kind !== "TEAM") ||
    (mode === "INDIVIDUAL_ONLY" && kind !== "INDIVIDUAL")
  ) {
    throw new TopicApplicationKindForbiddenError();
  }
}

export function normalizeApplicationAnswers(
  questions: TopicApplicationConfiguration["questions"],
  answers: Array<{ questionId: string; value: string }>,
): Array<{ questionId: string; value: string }> {
  const answerMap = new Map<string, string>();
  for (const answer of answers) {
    if (answerMap.has(answer.questionId)) throw new InvalidTopicApplicationAnswersError();
    answerMap.set(answer.questionId, answer.value.trim());
  }
  if ([...answerMap.keys()].some((questionId) => !questions.some(({ id }) => id === questionId))) {
    throw new InvalidTopicApplicationAnswersError("등록되지 않은 지원서 문항이 포함되어 있습니다.");
  }
  return questions.map((question) => {
    const value = answerMap.get(question.id) ?? "";
    if ((question.required && value.length === 0) || value.length > question.maxLength) {
      throw new InvalidTopicApplicationAnswersError();
    }
    return { questionId: question.id, value };
  });
}

export function normalizeTeamMemberEmails(
  emails: string[],
  leaderEmail: string,
  capacity: number,
): string[] {
  const normalizedLeader = leaderEmail.trim().toLowerCase();
  const normalized = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (
    normalized.length === 0 ||
    normalized.length + 1 > capacity ||
    normalized.includes(normalizedLeader) ||
    normalized.some((email) => !/^[^@\s]+@pusan\.ac\.kr$/i.test(email))
  ) {
    throw new InvalidTeamApplicationMembersError(
      `팀원은 본인을 제외한 부산대학교 이메일로 입력하고 전체 인원은 ${capacity}명을 넘을 수 없습니다.`,
    );
  }
  return normalized;
}
