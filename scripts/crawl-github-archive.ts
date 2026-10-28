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
  /** 팀 설정이 없을 때 레포 이름 끝 숫자를 조 번호로 쓴다. "capstone-2026-team-07" 은 7조. */
  teamNumberFromRepoName?: boolean;
};

// 정보컴퓨터공학부 졸업과제. 공개 아카이브에서는 빠지는 대분류다(hidden-graduation-program.ts).
// 기간은 학기 시작부터 조직에 마지막 레포가 생긴 달 말까지로 잡았다. 2024 조직은 템플릿뿐이다.
// 2025 는 조직에 남은 레포가 30개뿐이라 OPUS 스냅샷(opus-project-catalog.ts)의 48팀으로 채웠다.
// 팀 이름, 과제명, 발표 영상은 OPUS, 소개는 README 에서 옮겼다. 나머지 18개는 학생 계정으로 옮겨졌고
// 조직 주소가 그쪽으로 넘겨 준다. 다시 긁어도 이미 있는 레포는 그대로 둔다.
const GRADUATION = { category: "CSE 캡스톤 디자인", icon: "GRADUATION_CAP", teamNumberFromRepoName: true } as const;

const PROGRAMS: ProgramSource[] = [
  {
    key: "pnu-convergence-sw-hackathon-5",
    org: "The-5th-PNU-Convergence-SW-Hackathon",
    programName: "제5회 PNU 창의융합SW해커톤",
    // 운영의 제6회, 제7회와 같은 대분류(2026-10-23 운영 DB 확인). 다르면 5회만 탭이 따로 생긴다.
    category: "PNU 창의융합AI해커톤",
    startsAt: "2024-05-01",
    endsAt: "2024-09-07",
    // 팀 이름과 제목은 2024-09-04 swedu 공지 "최종 결과물 온라인 투표안내", 상은 2024-09-11 swedu
    // 홍보자료 "[제5회 PNU 창의융합 SW해커톤] 성료" 의 수상 현황표에서 옮겼다.
    teams: {
      "PNUSW-2024-team-01": { teamNumber: 1, teamName: "삼위일체", title: "부산대 모든 공지사항" },
      "PNUSW-2024-team-02": { teamNumber: 2, teamName: "스근하게", title: "부산대 제휴 업체를 한눈에", award: "장려상" },
      "PNUSW-2024-team-03": { teamNumber: 3, teamName: "따뜻한청년들2", title: "시니어 돌봄 매칭 플랫폼", award: "대상" },
      "PNUSW-2024-team-05": { teamNumber: 5, teamName: "인사이드아웃", title: "우울감 관리 플랫폼", award: "장려상" },
      "PNUSW-2024-team-06": { teamNumber: 6, teamName: "아이엠그루트", title: "글쓰기를 통한 식물 테라피", award: "장려상" },
      "PNUSW-2024-team-07": { teamNumber: 7, teamName: "피누", title: "가족 소통 어플리케이션", award: "우수상" },
      "PNUSW-2024-team-08": { teamNumber: 8, teamName: "포포", title: "지역 유기동물 문제 해결 플랫폼", award: "우수상" },
      "PNUSW-2024-team-09": { teamNumber: 9, teamName: "구은생선", title: "대학생 맞춤 알바 구직 서비스", award: "장려상" },
      "PNUSW-2024-team-10": { teamNumber: 10, teamName: "히론", title: "유학생들을 위한 여행, 생활 도움 서비스", award: "장려상" },
      "PNUSW-2024-team-11": { teamNumber: 11, teamName: "피벗", title: "부산대 맞춤형 중고거래 서비스", award: "장려상" },
      "PNUSW-2024-team-12": { teamNumber: 12, teamName: "이륙허가", title: "부산대 공유 택시 서비스" },
      "PNUSW-2024-team-13": { teamNumber: 13, teamName: "OwO", title: "HPE를 통한 환자 관리 모듈 개발" },
      "PNUSW-2024-team-14": { teamNumber: 14, teamName: "자스민", title: "사기피해 예방 안심 결제 시스템", award: "우수상" },
      "PNUSW-2024-team-16": { teamNumber: 16, teamName: "Mizi", title: "청년을 위한 미래 자산 관리 서비스" },
      "PNUSW-2024-team-17": { teamNumber: 17, teamName: "구름", title: "부산대 프로젝트 배포 플랫폼", award: "우수상" },
      "PNUSW-2024-team-18": { teamNumber: 18, teamName: "어웨이크", title: "졸음운전 예방을 위한 LLM 대화모델", award: "최우수상" },
    },
  },
  {
    key: "kakao-tech-campus-2",
    org: "kakao-tech-campus-2nd-step3",
    programName: "카카오테크 캠퍼스 2기",
    category: "카카오테크 캠퍼스",
    // 3단계(팀 프로젝트) 기간. 아이디어톤 8/22 시작, 최종발표회 메모리즈 2024-12 게시.
    startsAt: "2024-08-22",
    endsAt: "2024-11-30",
    // 5개 대학이 한 조직을 쓴다. 부산대 조는 2기 아이디어톤 스페이스의 조별 실습 페이지 표에서 옮겼다
    // (10~13조 웹, 24~25조 안드로이드). 조마다 FE, BE 레포가 따로 있어 README 가 프로젝트를 가장 잘
    // 설명하는 레포 하나를 건다. 나머지 레포는 대개 그 README 에서 이어진다.
    teams: {
      Team10_FE: { teamNumber: 10, teamName: "10조", title: "품앗이: 농산물로 지역을 잇는 플랫폼", summary: "농민과 소비자를 직접 연결하는 농산물 온라인 직거래 플랫폼입니다." },
      Team11_BE: { teamNumber: 11, teamName: "11조", title: "부메랑: 전세사기 피해자를 위한 대처 플랫폼" },
      Team12_BE: { teamNumber: 12, teamName: "12조", title: "Ditto: 경쟁을 곁들인 스터디 관리 플랫폼", summary: "스터디 관리에 경쟁 요소를 더한 플랫폼입니다." },
      Team13_FE: { teamNumber: 13, teamName: "13조", title: "돌봄다리: 요양원 관리 서비스", summary: "보호자는 가족의 상태를 실시간으로 확인하고, 요양보호사는 손쉽게 기록하는 요양원 관리 서비스입니다." },
      Team24_Android: { teamNumber: 24, teamName: "24조", title: "Challenge On Air: 실시간 챌린지 플랫폼" },
      Team25_Android: { teamNumber: 25, teamName: "25조", title: "메디투게더: 병원 동행 서비스 매칭 플랫폼", summary: "도움이 필요한 환자와 병원 동행 매니저를 매칭해 병원 이용을 돕는 서비스입니다." },
    },
  },
  {
    key: "kakao-tech-campus-3",
    org: "kakao-tech-campus-3rd-step3",
    programName: "카카오테크 캠퍼스 3기",
    category: "카카오테크 캠퍼스",
    // 3단계 기간. 최종 산출물 제출 마감 2025-11-07.
    startsAt: "2025-08-18",
    endsAt: "2025-11-07",
    // 부산대 1~5팀은 3기 최종 프로젝트 산출물 제출 페이지의 팀 이름과 레포 설명(서비스 이름, 배포 주소)으로
    // 짝지었다. Team10~14 가 부산대다. 상은 레포 설명에 적힌 것만 옮겼다.
    teams: {
      Team10_FE: { teamNumber: 1, teamName: "1팀", title: "이게머니: 쉽고 정확하게, 나만의 경제 교과서" },
      Team11_BE: { teamNumber: 2, teamName: "2팀", title: "Momeet: 즉석 만남 매칭 서비스", summary: "가까운 곳에서 즉석 번개 모임을 만들고 참여하는 서비스입니다." },
      Team12_FE: { teamNumber: 3, teamName: "3팀", title: "UniSchedule: 대학생 팀 프로젝트 일정 조율" },
      Team13_BE: { teamNumber: 4, teamName: "4팀", title: "P-Ting: 교내 스포츠 매칭 플랫폼", summary: "운동 파트너를 찾기 어려운 대학생을 시간, 장소, 실력에 맞춰 매칭하는 교내 스포츠 플랫폼입니다." },
      Team14_FE: { teamNumber: 5, teamName: "5팀", title: "FestaPick: 모두가 함께 만드는 축제", award: "우수상", summary: "모두가 함께 만들어 가는 축제 플랫폼입니다." },
    },
  },
  {
    key: "pnu-ai-studygroup-2026",
    org: "2026-PNU-AI-StudyGroup",
    programName: "AI학습공동체 2026",
    // 운영에 이미 있는 프로그램(2026-10-26 운영 DB 확인)에 채운다. 이름, 기간, 공개 여부는 운영 값을 그대로 둔다.
    programId: "4a8393fa-1690-4acc-8fa8-3965e1889c03",
    category: "PNU AI학습공동체",
    startsAt: "2026-07-01",
    endsAt: "2026-09-30",
    // 팀 이름은 README 에 적힌 것만 쓴다. 적혀 있지 않은 팀은 번호로 부른다.
    teams: {
      "2026-pnuai-studygroup-01": { teamNumber: 1, teamName: "1팀", title: "PNU AIPMS: 학과 프로젝트 관리 플랫폼", summary: "프로그램 개설부터 팀 활동, 보고서 승인, 결과물 아카이브까지 학과 프로젝트의 흐름을 잇는 플랫폼입니다. aipms.pusan.ac.kr 에서 운영 중입니다." },
      "2026-pnuai-studygroup-02": { teamNumber: 2, teamName: "잇(IT)다", title: "냉장고 데이터를 부탁해: 식재료 기반 레시피 추천", summary: "식재료 데이터를 바탕으로 레시피를 추천하는 서비스입니다." },
      "2026-pnuai-studygroup-03": { teamNumber: 3, teamName: "AIdios", title: "WakeBook: 잠자는 도서를 깨우는 AI 추천", summary: "공공도서관에서 이용이 적은 잠자는 도서를 찾아 AI 추천과 큐레이션으로 이용자에게 다시 잇는 웹 서비스입니다." },
      "2026-pnuai-studygroup-04": { teamNumber: 4, teamName: "노예(진)", title: "뇌 MRI 병변 Segmentation (CBAS)", summary: "뇌 MRI 영상에서 병변을 찾아내는 Segmentation 모델과 데이터 수집, 전처리 파이프라인입니다." },
      "2026-pnuai-studygroup-05": { teamNumber: 5, teamName: "5팀", title: "산복도로 골든타임: 응급 취약지 분석과 AED 최적 배치", summary: "부산 산복도로 일대에서 심정지 골든타임을 지키기 위해 응급 취약성과 구급차 도달 지연을 분석하고 AED 최적 배치를 도출합니다." },
    },
  },
  { key: "pnu-cse-capstone-2023", org: "pnucse-capstone", programName: "정보컴퓨터공학부 졸업과제 2023", startsAt: "2023-03-02", endsAt: "2023-10-31", ...GRADUATION },
  { key: "pnu-cse-capstone-2025", org: "pnucse-capstone2025", programName: "정보컴퓨터공학부 졸업과제 2025", startsAt: "2025-03-04", endsAt: "2025-09-30", ...GRADUATION },
  { key: "pnu-cse-capstone-2026", org: "pnucse-capstone2026", programName: "정보컴퓨터공학부 졸업과제 2026", startsAt: "2026-03-03", endsAt: "2026-09-30", ...GRADUATION },
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
  const { teams, teamNumberFromRepoName, ...program } = source;
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
    const numbered = teamNumberFromRepoName ? Number(repo.name.match(/(\d+)$/)?.[1]) || null : null;
    repos.push({
      fullName: repo.full_name,
      url: repo.html_url,
      teamNumber: team?.teamNumber ?? numbered,
      teamName: team?.teamName ?? (numbered ? `${numbered}조` : repo.name),
      title: team?.title ?? pickTitle({ readmeTitle: extracted.title, description: repo.description, repoName: repo.name }),
      summary: team?.summary ?? extracted.summary,
      award: team?.award ?? null,
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
