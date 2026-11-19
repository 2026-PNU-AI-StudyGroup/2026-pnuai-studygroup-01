// GitHub README 에서 카드에 쓸 값을 뽑는 순수 함수.
// 앱(프로젝트 카드 채우기)과 아카이브 이관 스크립트가 함께 쓴다. 스크립트는 운영 시드 이미지에서
// 돌고 그 이미지에는 `@/` 경로 해석이 없다. 그래서 이 파일은 `@/` 를 가져오지 않는다.

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

export type GithubRepo = { owner: string; repo: string };

/** 레포 주소에서 owner 와 repo 를 뽑는다. 하위 경로와 .git 은 normalizeRepoUrl 이 걷어 낸다. */
export function parseGithubRepo(url: string): GithubRepo | null {
  const match = normalizeRepoUrl(url).match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)$/);
  if (!match) return null;
  // "." 와 ".." 는 문자 규칙을 통과하지만 경로 이동이라 이름이 될 수 없다.
  if ([match[1], match[2]].some((part) => part === "." || part === "..")) return null;
  return { owner: match[1]!, repo: match[2]! };
}

const ASSET_HOSTS = new Set([
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "private-user-images.githubusercontent.com",
  "objects.githubusercontent.com",
]);

/**
 * 서버가 대신 받아도 되는 그림 주소인지 본다. 서버가 남의 주소를 받는 기능이라
 * 학생이 README 에 내부망 주소를 적어 서버를 찌르지 못하게 GitHub 그림 호스트로 묶는다.
 */
export function isAllowedGithubAssetUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  if (ASSET_HOSTS.has(url.hostname)) return true;
  return url.hostname === "github.com" && url.pathname.startsWith("/user-attachments/");
}

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)/g;
const HTML_IMAGE = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi;
const BADGE_IMAGE = /shields\.io|badgen\.net|badge|codecov\.io|travis-ci|\/actions\/workflows\//i;

function resolveReadmeImage(src: string, source: GithubRepo & { branch: string }): string | null {
  const blob = src.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^?#]+)/);
  if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
  if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith("//")) return src;
  const path = src.replace(/[?#].*$/, "").replace(/^\.?\//, "");
  if (!path || path.split("/").includes("..")) return null;
  return `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.branch}/${path}`;
}

/** README 의 첫 그림을 받을 수 있는 주소로 돌려준다. 배지와 허용 목록 밖 주소는 건너뛴다. */
export function firstReadmeImage(markdown: string, source: GithubRepo & { branch: string }): string | null {
  const candidates = [...markdown.matchAll(MARKDOWN_IMAGE), ...markdown.matchAll(HTML_IMAGE)]
    .sort((left, right) => left.index - right.index)
    .map((match) => match[1]!);
  for (const candidate of candidates) {
    if (BADGE_IMAGE.test(candidate)) continue;
    const resolved = resolveReadmeImage(candidate, source);
    if (resolved && isAllowedGithubAssetUrl(resolved)) return resolved;
  }
  return null;
}
