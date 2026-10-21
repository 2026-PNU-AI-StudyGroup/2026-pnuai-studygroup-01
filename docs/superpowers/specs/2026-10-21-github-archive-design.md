# 사업별 결과물 공개 아카이브 설계

날짜: 2026-10-21
상태: 사용자 검토 대기
브랜치: `feat/github-archive`

## 목적

실장님 요청. AI융합교육원이 주관하거나 참여한 사업(해커톤, 카카오테크캠퍼스, PNU AI 부스터, 졸업과제)의 결과물은 사업마다 다른 GitHub 조직에 흩어져 있다. 현장평가에서 평가위원이 이 결과물을 보고 평가한다. 평가위원이 PMS 한 곳에 직접 접속해 사업별로 훑어보고, 눌러서 GitHub 저장소로 넘어가게 한다.

## 확정 결정

| 항목 | 결정 |
|---|---|
| 보는 사람 | 평가위원이 직접 접속한다. 로그인 없는 공개 화면이 필요하다 |
| 보여줄 단위 | 레포 하나에 카드 하나. 제목, 요약 두 줄, GitHub 버튼. README 본문은 GitHub에서 읽는다 |
| 데이터 성격 | 이미 끝난 사업의 결과물. 한 번 가져오면 거의 바뀌지 않는다. 자동 동기화는 하지 않는다 |
| 가져오는 방법 | 크롤링 결과를 JSON 스냅샷으로 레포에 커밋한다. PR에서 사람이 훑어보고 고친 뒤 넣는다 |
| 넣는 곳 | 기존 지난 프로그램과 프로젝트. OPUS 이관(`scripts/import-opus-archive.ts`)과 같은 방식. 마이그레이션 없음 |
| 졸업과제 | PMS에 넣지 않는다. 공개 화면에 GitHub 조직 링크만 둔다. 학생 화면 숨김(`hidden-graduation-programs.ts`)은 그대로 |

## 이미 PMS에 있는 것과 새로 넣을 것

| 사업 | 조직 | 처리 |
|---|---|---|
| 2025 창의융합 해커톤 | `2025-PNU-SW-Hackathon` | OPUS 이관으로 이미 있음. 넣지 않음 |
| 2025 PNU AI 부스터 | OPUS | 이미 있음 |
| 2026 AI 해커톤 | `PNU-2026-AI-Hackathon` | PMS에서 운영함. 넣지 않음 |
| 2024 PNU-PKNU 해커톤 | `PNU-PKNU-2024-hackerton` | 새로 넣음(4개) |
| 2023 해커톤, 카카오테크캠퍼스, 2026 AI 부스터 | 조직 이름 받는 중 | 받는 대로 목록에 추가 |
| 졸업과제 | `pnucse-capstone`, `pnucse-capstone2026` | 링크만 |

같은 저장소가 두 번 들어가지 않게 넣기 단계에서 `sourceUrl` 로 한 번 더 거른다(아래 2).

## 1. 크롤링: `scripts/crawl-github-archive.ts`

개발자 PC에서 돌린다. `GITHUB_TOKEN=$(gh auth token) npx tsx scripts/crawl-github-archive.ts`

- 스크립트 맨 위 상수에 사업 목록을 적는다. 항목마다 `key`, `org`, `programName`, `category`, `startsAt`, `endsAt`, 선택 `programId`(이미 만들어 둔 빈 프로그램에 채울 때).
- 조직의 공개 레포만 읽는다. 다음은 뺀다.
  - 이름이 템플릿류인 것: `template`, `StarterTemplate`, `-team-00` 으로 끝나는 것, `.github`, `*.github.io`
  - 비어 있거나 README 가 없는 것
- README 에서 뽑는 규칙은 순수 함수 `scripts/github-archive-readme.ts` 에 둔다.
  - 제목: 첫 `#`/`##` 제목. 단 번호로 시작하거나 "프로젝트 소개", "목차", "개요", "README" 같은 범용 제목이면 건너뛴다. 없으면 레포 설명. 설명이 "created by GitHub Classroom" 이면 레포 이름.
  - 요약: 제목 뒤 첫 문단 또는 인용문. 배지, 이미지, HTML 태그, 링크 문법을 걷어낸 글자만 200자까지.
  - 개인정보: 요약에서 이메일과 학번 형태(`20` 으로 시작하는 9자리 숫자)를 지운다. 실제 졸업과제 README 에 학번과 이메일이 그대로 있었다.
- 결과는 `scripts/github-archive/snapshot.json`. 모양은 `[{ program: {...}, repos: [{ fullName, url, title, summary, teamName }] }]`. `teamName` 기본값은 레포 이름.
- 이미 스냅샷에 있는 레포는 덮어쓰지 않는다. 손으로 고친 제목과 요약을 지킨다. 다시 뽑고 싶으면 그 항목을 지우고 돌린다.

## 2. 넣기: `scripts/import-github-archive.ts`

운영 서버에서 사람이 한 번 돌린다. `--confirm` 없으면 멈춘다(OPUS 스크립트와 같다).

- 기록용 계정 `github-archive-importer`, 이름 "GitHub 이관", 비활성.
- 모든 ID 는 `fullName` 에서 sha256 으로 유도한다. 몇 번을 돌려도 같은 행이 갱신될 뿐 늘지 않는다.
- 프로그램
  - `programId` 가 없으면 새로 만든다. 공개, 끝난 상태(`endProcessedAt`), 지도교수 끔, 아이콘 `TROPHY`. 대분류는 처음 만들 때만 넣는다(운영자가 합친 대분류를 되돌리지 않기 위해. OPUS 때 실제로 겪었다).
  - `programId` 가 있으면 프로그램 행은 건드리지 않고 프로젝트만 채운다. 공개 여부는 운영자가 화면에서 정한다.
- 레포 하나에
  - `Topic`: 제목, 설명(요약, 비었으면 제목), `sourceUrl`, 모집 끔, 정원 1, 작성자와 담당자는 기록용 계정.
  - `ProjectTeam`: `teamName`, `confirmedAt` 는 프로그램 시작일.
  - `Artifact`: `SOURCE_CODE` 외부 링크 하나. 아티팩트 INSERT 트리거 때문에 OPUS 의 `ensureArtifact` 처럼 있으면 UPDATE, 없으면 INSERT 로 가른다.
- 중복: 다른 프로젝트가 같은 저장소 URL(끝 `/`, `.git`, 대소문자 무시)을 이미 갖고 있으면 건너뛰고 로그를 남긴다. OPUS 이관분과 PMS 운영분이 여기서 걸러진다.
- 스냅샷에서 빠진 레포는 DB 에서 지우지 않는다. 내릴 것은 운영자가 화면에서 처리한다.

## 3. 공개 화면: `/archive`

로그인하지 않아도 열린다. 실장님께 드릴 주소는 `aipms.pusan.ac.kr/archive`.

- 대상: 끝났고 확정된 팀이 있는 공개 프로그램 전부. 학생에게 보이는 범위와 같다. 숨김 졸업과제 대분류는 뺀다.
- 구성
  - 위: 제목 "사업별 결과물", 사업 수와 프로젝트 수.
  - 사업(대분류) 탭. `?category=` 링크라 자바스크립트가 필요 없다. 순서는 기존 `ProgramCategoryOrder`.
  - 탭 안: 연도별, 그 안에서 프로그램별로 카드를 놓는다.
  - 맨 아래: 졸업과제 GitHub 조직 링크 묶음. 코드 상수 하나.
- 카드: 프로젝트 제목, 팀 이름, 요약 두 줄(넘치면 자름), 수상 표시, GitHub 버튼(새 창). GitHub 주소는 `sourceUrl`, 없으면 `SOURCE_CODE` 아티팩트. 고르는 로직은 `project-showcase-sections.tsx` 의 기존 함수를 쓴다. 주소가 없으면 버튼 없이 카드만.
- 싣지 않는 것: 팀원 이름, 담당자, 지도교수, 소개 글(`showcaseIntro`, OPUS 분에 팀원 이름이 들어 있다), 사진.
- 조회: `PrismaTeamArchiveQueryRepository` 에 공개용 메서드 하나를 더한다. select 에 이름 칸이 아예 없게 해서 실수로 나갈 길을 막는다.
- 로그인 화면(`sign-in-landing.tsx`)에 "사업별 결과물 보기" 링크.
- 화면 문구는 기존처럼 `ui-messages.en.json` 에 영어를 함께 둔다.

수가 수백 개 수준이라 페이지 나누기 없이 탭 하나를 한 번에 그린다. 탭 하나가 수백 개를 넘으면 그때 나눈다.

## 범위 밖

README 본문 렌더링, 사진과 썸네일, 검색, 자동 동기화, 관리자 등록 화면, 졸업과제 프로젝트 이관.

## 시험

- `github-archive-readme.test.ts`: 실제 README 두 종류로 제목과 요약을 확인한다. 졸업과제형("# 1. 프로젝트 소개" 뒤 학번과 이메일)과 해커톤형("# gridi" 뒤 인용문). 학번과 이메일이 요약에 남지 않는지.
- 공개용 조회 저장소 시험: 비공개 프로그램과 숨김 졸업과제 대분류가 빠지는지, select 에 회원과 담당자가 없는지.
- 로컬 DB 에 넣기를 두 번 돌려 행 수가 같은지 확인한다.
- 로그아웃 상태로 `/archive` 를 열어 탭, 카드, GitHub 링크를 확인한다.

## 운영 절차

1. PR 에서 `snapshot.json` 의 제목과 요약을 훑고 고친다.
2. 머지 후 운영 배포.
3. 운영 서버에서 넣기 스크립트를 `--confirm` 으로 한 번 실행한다. 정확한 명령은 PR 본문에 적는다.
4. 로그아웃 상태로 `/archive` 확인 후 실장님께 주소 전달.
