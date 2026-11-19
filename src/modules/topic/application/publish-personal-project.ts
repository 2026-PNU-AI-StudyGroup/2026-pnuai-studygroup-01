import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class PersonalProjectError extends Error {}

export type PublishPersonalProjectOutcome =
  | { status: "PUBLISHED"; projectId: string; teamId: string }
  | { status: "UNAVAILABLE" | "ALREADY_IN_PROGRAM" | "INVALID_DIVISION" };

export interface PersonalProjectPublisher {
  publish(input: {
    programId: string;
    studentId: string;
    title: string;
    description: string;
    divisionId: string | null;
    repoUrl: string | null;
    now: Date;
  }): Promise<PublishPersonalProjectOutcome>;
}

const FAILURE_MESSAGES = {
  UNAVAILABLE: "지금은 이 프로그램에 프로젝트를 올릴 수 없습니다. 등록 기간과 프로그램 설정을 확인해 주세요.",
  ALREADY_IN_PROGRAM: "이미 이 프로그램에 프로젝트가 있습니다. 학생 1명당 프로젝트 1개만 올릴 수 있습니다.",
  INVALID_DIVISION: "분과를 다시 선택해 주세요.",
} as const;

/** 수업 개인 과제처럼 승인 없이 바로 공개하는 1인 프로젝트를 올린다. */
export async function publishPersonalProject(
  actor: CurrentActor,
  input: { programId: string; title: string; description: string; divisionId?: string; repoUrl?: string },
  publisher: PersonalProjectPublisher,
  now = new Date(),
): Promise<{ status: "PUBLISHED"; projectId: string; teamId: string; repoUrl: string | null }> {
  if (actor.role !== "STUDENT") throw new PersonalProjectError("학생만 개인 프로젝트를 올릴 수 있습니다.");
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 200) throw new PersonalProjectError("프로젝트명은 1자 이상 200자 이하로 입력해 주세요.");
  if (!description || description.length > 10_000) throw new PersonalProjectError("설명을 입력해 주세요.");
  const rawRepoUrl = input.repoUrl?.trim() ?? "";
  const repo = rawRepoUrl ? parseGithubRepo(rawRepoUrl) : null;
  if (rawRepoUrl && !repo) throw new PersonalProjectError("GitHub 레포 주소를 확인해 주세요. 예: https://github.com/아이디/레포");
  const repoUrl = repo ? `https://github.com/${repo.owner}/${repo.repo}` : null;

  const outcome = await publisher.publish({
    programId: input.programId,
    studentId: actor.id,
    title,
    description,
    divisionId: input.divisionId || null,
    repoUrl,
    now,
  });
  if (outcome.status === "PUBLISHED") return { ...outcome, repoUrl };
  throw new PersonalProjectError(FAILURE_MESSAGES[outcome.status]);
}
