import { createHash } from "node:crypto";
export { normalizeRepoUrl, pickTitle, readmeTitleAndSummary, scrubPersonalInfo } from "../src/modules/github-readme/domain/readme";

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
  /** 담당자(교수)로 연결할 운영 계정 이메일. 없거나 계정이 없으면 이관용 계정이 담당자다. */
  managerEmail?: string;
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
  /** 발표 영상 주소. OPUS 에서 옮긴 졸업과제 2025 와 README 에 영상이 걸린 레포에 있다. */
  videoUrl?: string | null;
  /** 팀이 운영한 서비스 주소. README 에 적힌 것만. */
  serviceUrl?: string;
  /** 상세 화면 소개(마크다운). README 를 읽고 손으로 쓴 것. 이름, 이메일은 넣지 않는다. */
  intro?: string;
  /** github-archive/images 아래 갤러리 사진. README 와 레포의 사진 중 사람이 고른 것. */
  images?: string[];
  /** github-archive/images 아래 썸네일 파일. 유튜브 대표 이미지나 README 사진을 webp 로 줄인 것. */
  thumbnail?: string;
  /** 팀원 이름. 계정을 만들지 않고 팀에 이름만 적는다. 공식 명단에서 옮기고 팀장은 따로 두지 않는다. */
  members?: string[];
};

export type SnapshotProgram = { program: ArchiveProgram; repos: SnapshotRepo[] };

const TEMPLATE_REPO = /template|^\.github$|\.github\.io$|-team-00$|-test$/i;

/** 템플릿과 조직 소개 레포는 결과물이 아니다. */
export function isTemplateRepo(name: string): boolean {
  return TEMPLATE_REPO.test(name);
}

/** 팀 번호 순, 번호 없는 레포는 뒤로 보내고 같으면 레포 이름 순. 크롤링 결과와 합친 스냅샷이 같은 차례를 쓴다. */
export function compareSnapshotRepos(left: SnapshotRepo, right: SnapshotRepo): number {
  return (left.teamNumber ?? Number.MAX_SAFE_INTEGER) - (right.teamNumber ?? Number.MAX_SAFE_INTEGER)
    || left.fullName.localeCompare(right.fullName);
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
