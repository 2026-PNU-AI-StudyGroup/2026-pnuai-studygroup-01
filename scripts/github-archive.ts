import { createHash } from "node:crypto";

// GitHub 결과물 이관에 쓰는 순수 함수와 스냅샷 모양.
// 크롤링(crawl-github-archive.ts)과 넣기(import-github-archive.ts)가 함께 쓴다.
// 넣기는 운영 서버의 시드용 이미지에서 돌고 그 이미지에는 scripts 와 생성된 Prisma 클라이언트만
// 있다. 그래서 이 파일은 `@/` 경로를 가져오지 않는다.

export type ArchiveProgram = {
  /** ID 를 유도하는 고정 키. 바꾸면 다른 프로그램이 새로 생긴다. */
  key: string;
  org: string;
  programName: string;
  category: string;
  /** KST 날짜 YYYY-MM-DD */
  startsAt: string;
  endsAt: string;
  /** 이미 만들어 둔 빈 프로그램에 채울 때만 쓴다. 있으면 프로그램 행은 건드리지 않는다. */
  programId?: string;
  /** 없으면 TROPHY. */
  icon?: "TROPHY" | "GRADUATION_CAP";
};

export type ArchiveTeam = {
  teamNumber?: number;
  teamName: string;
  title: string;
  award?: string;
  /** README 첫 문단이 목차나 레포 이름뿐일 때 README 본문에서 옮겨 적은 소개. 없으면 README 에서 뽑는다. */
  summary?: string;
};

export type SnapshotRepo = {
  /** ID 를 유도하는 고정 키. url 이 없어도 그대로 둔다. */
  fullName: string;
  /** 소스 코드 주소. 출처가 엉뚱한 레포를 가리켜 링크를 걸 수 없으면 null. */
  url: string | null;
  teamNumber: number | null;
  teamName: string;
  title: string;
  summary: string;
  /** 공식 발표에서 옮긴 상 이름. 상이 없으면 null. */
  award: string | null;
  /** 발표 영상 주소. OPUS 에서 옮긴 졸업과제 2025 에만 있다. */
  videoUrl?: string | null;
  /** github-archive/images 아래 썸네일 파일. 유튜브 대표 이미지나 README 사진을 webp 로 줄인 것. */
  thumbnail?: string;
};

export type SnapshotProgram = { program: ArchiveProgram; repos: SnapshotRepo[] };

const TEMPLATE_REPO = /template|^\.github$|\.github\.io$|-team-00$|-test$/i;
const GENERIC_HEADING = /^\d+[.)]|프로젝트\s*소개|목차|개요|readme|introduction|table of contents/i;
const GOAL_HEADING = /^#{1,6}\s.*목표/;
const ANY_HEADING = /^#{1,6}\s/;
// 팀원 명단이 들어 있는 소제목. 제목으로도 요약으로도 쓰지 않는다.
const TEAM_HEADING = /팀\s*(?:소개|원|구성)|구성원|멤버|contributors?|members?|\bteam\b/i;
const TOP_HEADING = /^#{1,2}\s+(.+)$/;
// "개발목표", "1 ) 개발 목표", "개발 배경 및 필요성", "주요 내용" 처럼 소제목 노릇만 하는 줄. 요약에 넣지 않는다.
const LABEL_LINE = /^(?:\d+\s*[.)]\s*)?(?:개발\s*(?:목표|배경)(?:\s*및\s*(?:주요\s*내용|필요성))?|주요\s*내용)$/;
const CLASSROOM_DESCRIPTION = /created by GitHub Classroom/i;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const STUDENT_ID = /\b20\d{7}\b/g;
const PHONE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const SUMMARY_LENGTH = 200;

/** 템플릿과 조직 소개 레포는 결과물이 아니다. */
export function isTemplateRepo(name: string): boolean {
  return TEMPLATE_REPO.test(name);
}

/**
 * 마크다운 한 줄에서 서식을 걷어내고 글자만 남긴다. 배지는 이미지가 먼저 지워져 빈 링크가 된다.
 * 번호 목록("1. ")은 지우지 않는다. 지우면 "# 2. 팀 소개" 가 범용 제목 검사를 빠져나가
 * 팀원 명단이 요약으로 나간다.
 */
function plainText(line: string): string {
  return line
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/[*_`~>#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 요약에 이메일, 학번, 전화번호가 섞여 나가지 않게 지운다. 실제 졸업과제 README 에 이메일과 학번이 있었다. */
export function scrubPersonalInfo(text: string): string {
  return text.replace(EMAIL, " ").replace(STUDENT_ID, " ").replace(PHONE, " ").replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * start 줄부터 처음으로 글자가 남는 문단 하나를 모은다. 소제목과 "개발목표" 같은 낱말 줄은 소제목처럼 취급한다.
 * 팀 소개 소제목 아래는 start 앞에서 이어졌더라도 통째로 건너뛴다.
 */
function firstParagraph(lines: readonly string[], start: number): string {
  const collected: string[] = [];
  let inTeamSection = false;
  for (const [index, line] of lines.entries()) {
    if (ANY_HEADING.test(line)) {
      if (index >= start && collected.length) break;
      inTeamSection = TEAM_HEADING.test(plainText(line));
      continue;
    }
    if (index < start || inTeamSection) continue;
    const text = plainText(line);
    if (!text) {
      if (collected.length) break;
      continue;
    }
    if (LABEL_LINE.test(text)) {
      if (collected.length) break;
      continue;
    }
    collected.push(text);
  }
  return collected.join(" ");
}

/**
 * README 에서 카드에 쓸 제목과 요약을 뽑는다.
 *
 * 제목은 첫 `#`/`##` 제목이다. "1. 프로젝트 소개" 처럼 어느 레포에나 있는 제목은 건너뛴다.
 * 요약은 제목이 있으면 그 바로 아래 문단, 없으면 "목표" 가 든 소제목 아래 문단, 그것도 없으면
 * 첫 소제목 아래 문단이다. 대회 템플릿이 "개발 목표 및 주요 내용" 에 소개를 적게 되어 있다.
 */
export function readmeTitleAndSummary(markdown: string): { title: string | null; summary: string } {
  const lines = markdown.split(/\r?\n/);
  let title: string | null = null;
  let titleIndex = -1;
  for (const [index, line] of lines.entries()) {
    const heading = line.match(TOP_HEADING);
    const text = heading ? plainText(heading[1]!) : "";
    if (text && !GENERIC_HEADING.test(text) && !TEAM_HEADING.test(text)) {
      title = text;
      titleIndex = index;
      break;
    }
  }
  const goalIndex = lines.findIndex((line) => GOAL_HEADING.test(line));
  const firstHeadingIndex = lines.findIndex((line) => ANY_HEADING.test(line));
  const start = titleIndex >= 0 ? titleIndex + 1 : goalIndex >= 0 ? goalIndex + 1 : firstHeadingIndex + 1;
  // 한 줄짜리 거대한 문단이 이메일 정규식을 느리게 만들지 못하게 지우기 전에 먼저 자른다.
  const paragraph = firstParagraph(lines, start).slice(0, 1000);
  return { title, summary: truncate(scrubPersonalInfo(paragraph), SUMMARY_LENGTH) };
}

/** README 제목, 레포 설명, 레포 이름 순. Classroom 이 넣은 기본 설명은 의미가 없어 건너뛴다. */
export function pickTitle(input: { readmeTitle: string | null; description: string | null; repoName: string }): string {
  if (input.readmeTitle) return input.readmeTitle;
  const description = input.description?.trim();
  if (description && !CLASSROOM_DESCRIPTION.test(description)) return description;
  return input.repoName;
}

/** 팀 번호 순, 번호 없는 레포는 뒤로 보내고 같으면 레포 이름 순. 크롤링 결과와 합친 스냅샷이 같은 차례를 쓴다. */
export function compareSnapshotRepos(left: SnapshotRepo, right: SnapshotRepo): number {
  return (left.teamNumber ?? Number.MAX_SAFE_INTEGER) - (right.teamNumber ?? Number.MAX_SAFE_INTEGER)
    || left.fullName.localeCompare(right.fullName);
}

/** 같은 저장소를 같은 문자열로 맞춘다. 중복 판단에 쓴다. */
export function normalizeRepoUrl(url: string): string {
  const cleaned = url
    .trim()
    .toLowerCase()
    .replace(/^http:\/\//, "https://")
    .replace(/^https:\/\/www\./, "https://")
    .replace(/[?#].*$/, "");
  const repo = cleaned.match(/^https:\/\/github\.com\/[^/]+\/[^/]+/)?.[0] ?? cleaned.replace(/\/+$/, "");
  return repo.replace(/\.git$/, "");
}

/**
 * 새로 긁은 결과를 커밋된 스냅샷에 합친다.
 *
 * 프로그램 정보는 스크립트 설정이 이긴다. 레포는 이미 있는 항목을 그대로 둔다. PR 에서 손으로
 * 고친 제목과 요약이 다시 돌릴 때 지워지면 안 된다. 다시 뽑고 싶으면 그 항목을 지우고 돌린다.
 * 설정에서 빠진 프로그램도 지우지 않는다. 이미 운영에 들어갔을 수 있다.
 */
export function mergeSnapshot(existing: readonly SnapshotProgram[], crawled: readonly SnapshotProgram[]): SnapshotProgram[] {
  const previous = new Map(existing.map((entry) => [entry.program.key, entry]));
  const merged = crawled.map(({ program, repos }) => {
    const kept = previous.get(program.key)?.repos ?? [];
    const known = new Set(kept.map(({ fullName }) => fullName.toLowerCase()));
    const added = repos.filter(({ fullName }) => !known.has(fullName.toLowerCase()));
    return { program, repos: [...kept, ...added].sort(compareSnapshotRepos) };
  });
  const crawledKeys = new Set(crawled.map(({ program }) => program.key));
  return [...merged, ...existing.filter(({ program }) => !crawledKeys.has(program.key))];
}

/** 출처 키에서 항상 같은 UUID 를 만든다. 다시 돌려도 새 행이 생기지 않게. OPUS 이관과 같은 방식이다. */
export function stableArchiveId(...parts: string[]): string {
  const hex = createHash("sha256").update(`github:${parts.join(":")}`).digest("hex");
  const variant = ((Number.parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return [hex.slice(0, 8), hex.slice(8, 12), `4${hex.slice(13, 16)}`, `${variant}${hex.slice(17, 20)}`, hex.slice(20, 32)].join("-");
}
