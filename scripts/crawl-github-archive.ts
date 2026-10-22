import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type ArchiveProgram,
  type ArchiveTeam,
  type SnapshotProgram,
  type SnapshotRepo,
  compareSnapshotRepos,
  isTemplateRepo,
  mergeSnapshot,
  pickTitle,
  readmeTitleAndSummary,
} from "./github-archive";

// 끝난 사업의 GitHub 결과물을 긁어 snapshot.json 에 합친다. 개발자 PC 에서 돌린다.
// 실행: GITHUB_TOKEN=$(gh auth token) npx tsx scripts/crawl-github-archive.ts
// 결과는 PR 에서 사람이 훑고 고친 뒤 import-github-archive.ts 로 운영에 들어간다.

type ProgramSource = ArchiveProgram & {
  /** 공지 등에서 확인한 팀. 있으면 여기 적힌 레포만 넣고 팀 번호, 팀 이름, 제목을 여기서 쓴다. */
  teams?: Record<string, ArchiveTeam>;
};

const PROGRAMS: ProgramSource[] = [
  {
    key: "pnu-convergence-sw-hackathon-5",
    org: "The-5th-PNU-Convergence-SW-Hackathon",
    programName: "제5회 PNU 창의융합SW해커톤",
    // OPUS 로 옮긴 제6회와 같은 대분류. 운영에서 이름을 바꿨으면 넣은 뒤 화면에서 합친다.
    category: "PNU 창의융합 해커톤",
    startsAt: "2024-05-01",
    endsAt: "2024-09-07",
    teams: {
      "PNUSW-2024-team-01": { teamNumber: 1, teamName: "삼위일체", title: "부산대 모든 공지사항" },
      "PNUSW-2024-team-02": { teamNumber: 2, teamName: "스근하게", title: "부산대 제휴 업체를 한눈에" },
      "PNUSW-2024-team-03": { teamNumber: 3, teamName: "따뜻한청년들2", title: "시니어 돌봄 매칭 플랫폼" },
      "PNUSW-2024-team-05": { teamNumber: 5, teamName: "인사이드아웃", title: "우울감 관리 플랫폼" },
      "PNUSW-2024-team-06": { teamNumber: 6, teamName: "아이엠그루트", title: "글쓰기를 통한 식물 테라피" },
      "PNUSW-2024-team-07": { teamNumber: 7, teamName: "피누", title: "가족 소통 어플리케이션" },
      "PNUSW-2024-team-08": { teamNumber: 8, teamName: "포포", title: "지역 유기동물 문제 해결 플랫폼" },
      "PNUSW-2024-team-09": { teamNumber: 9, teamName: "구은생선", title: "대학생 맞춤 알바 구직 서비스" },
      "PNUSW-2024-team-10": { teamNumber: 10, teamName: "히론", title: "유학생들을 위한 여행, 생활 도움 서비스" },
      "PNUSW-2024-team-11": { teamNumber: 11, teamName: "피벗", title: "부산대 맞춤형 중고거래 서비스" },
      "PNUSW-2024-team-12": { teamNumber: 12, teamName: "이륙허가", title: "부산대 공유 택시 서비스" },
      "PNUSW-2024-team-13": { teamNumber: 13, teamName: "OwO", title: "HPE를 통한 환자 관리 모듈 개발" },
      "PNUSW-2024-team-14": { teamNumber: 14, teamName: "자스민", title: "사기피해 예방 안심 결제 시스템" },
      "PNUSW-2024-team-16": { teamNumber: 16, teamName: "Mizi", title: "청년을 위한 미래 자산 관리 서비스" },
      "PNUSW-2024-team-17": { teamNumber: 17, teamName: "구름", title: "부산대 프로젝트 배포 플랫폼" },
      "PNUSW-2024-team-18": { teamNumber: 18, teamName: "어웨이크", title: "졸음운전 예방을 위한 LLM 대화모델" },
    },
  },
];

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN 이 필요합니다. GITHUB_TOKEN=$(gh auth token) 으로 실행하세요.");

type GithubRepo = { name: string; full_name: string; html_url: string; description: string | null; private: boolean; size: number };

async function github(path: string, accept = "application/vnd.github+json"): Promise<Response> {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok && response.status !== 404) throw new Error(`GitHub ${response.status}: ${path}`);
  return response;
}

async function listPublicRepos(org: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  for (let page = 1; ; page += 1) {
    const response = await github(`orgs/${org}/repos?type=public&per_page=100&page=${page}`);
    if (response.status === 404) throw new Error(`조직을 찾지 못했습니다: ${org}`);
    const batch = (await response.json()) as GithubRepo[];
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

async function readme(fullName: string): Promise<string | null> {
  const response = await github(`repos/${fullName}/readme`, "application/vnd.github.raw");
  return response.status === 404 ? null : response.text();
}

async function crawl(source: ProgramSource): Promise<SnapshotProgram> {
  const { teams, ...program } = source;
  const repos: SnapshotRepo[] = [];
  for (const repo of await listPublicRepos(source.org)) {
    // 포크는 빼지 않는다. 제5회 조직의 레포는 전부 팀 레포를 포크해 모은 것이다.
    if (repo.private || repo.size === 0 || isTemplateRepo(repo.name)) continue;
    const team = teams?.[repo.name];
    if (teams && !team) continue;
    const markdown = await readme(repo.full_name);
    if (markdown === null) {
      console.warn(`  README 없음, 건너뜀: ${repo.full_name}`);
      continue;
    }
    const extracted = readmeTitleAndSummary(markdown);
    repos.push({
      fullName: repo.full_name,
      url: repo.html_url,
      teamNumber: team?.teamNumber ?? null,
      teamName: team?.teamName ?? repo.name,
      title: team?.title ?? pickTitle({ readmeTitle: extracted.title, description: repo.description, repoName: repo.name }),
      summary: extracted.summary,
    });
  }
  // PR diff 가 매번 같은 차례로 나오게 팀 번호, 없으면 레포 이름 순으로 둔다.
  repos.sort(compareSnapshotRepos);
  const missing = teams ? Object.keys(teams).filter((name) => !repos.some(({ fullName }) => fullName.endsWith(`/${name}`))) : [];
  if (missing.length) console.warn(`  설정에는 있는데 못 찾은 레포: ${missing.join(", ")}`);
  return { program, repos };
}

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(here, "github-archive", "snapshot.json");

async function main() {
  const existing = JSON.parse(await readFile(snapshotPath, "utf8").catch(() => "[]")) as SnapshotProgram[];
  const crawled: SnapshotProgram[] = [];
  for (const source of PROGRAMS) {
    const entry = await crawl(source);
    console.log(`${source.programName}: ${entry.repos.length}개`);
    crawled.push(entry);
  }
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(mergeSnapshot(existing, crawled), null, 2)}\n`);
  console.log(`저장: ${snapshotPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
