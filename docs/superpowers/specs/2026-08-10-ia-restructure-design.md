# 정보구조(IA) 재구조 설계

- 날짜: 2026-08-10
- 브랜치: `design/ia-restructure` (main 기준)
- 상태: 설계 확정 대기 → 승인 후 구현 계획(writing-plans)

## 1. 배경 / 문제

기능은 충분하지만 화면 구조가 개발 폴더구조를 그대로 노출해, 사용자 멘탈 모델과 어긋난다. IA 감사 결과:

- 실제 페이지 **48개** + 죽은 리다이렉트 별칭 **9개** = 라우트 57개. 전역 메뉴는 역할당 **4개**뿐이라 대부분 묻힘.
- 전역 "팀" 메뉴가 `/teams`가 아니라 `/recruitments`(모집게시판)로 가고, 팀 관련이 5페이지에 흩어짐.
- `applications` 세그먼트가 서로 다른 5개 의미로 재사용됨. `reports`도 팀 제출 vs 프로그램 요건으로 충돌.
- `/dashboard`·`/project-approvals`가 역할에 따라 완전히 다른 화면(주소가 내용을 안 알려줌).
- `/account`+`/account/profile`, `/admin/professors`+`/new`+`/history` 등 **"화면당 책임 1개" 규칙이 강제한 분리**가 "같은 기능 두 페이지" 체감을 만든다.
- 이름 3중 불일치: 경로 `topics` = 라벨 "프로젝트 찾기" = 엔티티 `Topic`.

## 2. 목표 / 비목표

**목표**
- 역할별 상위 메뉴를 사용자 멘탈 모델에 맞춰 재편.
- 강제 분리된 화면 묶음을 한 화면(요약+편집, 탭)으로 통합.
- 죽은 별칭 삭제, 세그먼트 이름 정리, 라벨 명확화.

**비목표(이번 아님)**
- 비주얼 톤/디자인 월드 재정의 → 구조 확정 후 별도 진행(편성표 방향은 폐기).
- 도메인/서비스 로직 변경. IA는 라우팅·UI 층만 손댄다. 권한 판정(`TeamWorkspaceQueryService`, `requireProfessorWorkspaceActor` 등)은 유지.
- 신규 기능 추가.

## 3. 확정 결정 (사용자 승인)

1. 학생 팀 영역 = **"내 팀" 부모 + 하위 2탭**(작업공간 / 팀 꾸리기). 두 상위 메뉴로 쪼개지 않음. 팀 상태에 따라 기본 탭 자동 선택.
2. **"화면당 책임 1개" 규칙 폐기** — `tests/routes/integration/route-responsibility-splits.test.tsx` 삭제. 통합의 전제.
3. **죽은 별칭 9개 깔끔히 삭제**(리다이렉트도 남기지 않음).
4. **편성표 톤 폐기, 톤은 완전히 새로** — 구조 확정 후 탐색.

## 4. 신규 사이트맵

공통 유틸(상단/사이드 고정): 🔔 알림(`/notifications`) · 계정 메뉴(계정 정보 · 피드백 보내기 · 로그아웃).

### 학생 (STUDENT)
- **둘러보기** — 진행 중 프로젝트 · 지난 프로젝트(아카이브)
- **내 팀**
  - 작업공간: 개요 · 할 일 · 팀 대화 · 회의·검토 · 보고서 · 결과물
  - 팀 꾸리기: 모집 둘러보기·지원 · 내 팀 만들기·초대·지원자 관리 · 내 지원 현황
- **공지사항**

### 교수 (PROFESSOR)
- **둘러보기**
- **지도 현황** — 내가 지도하는 팀 · 보고서/일정 검토
- **주제 관리** — 내 주제(등록·편집·일정·조교) · 받은 지원서 · 학생 제안 검토
- **공지사항**

### 관리자 (ADMIN)
- **둘러보기**
- **전체 현황** — 프로젝트 overview
- **운영 관리** — 프로그램(상세 안 탭: 설정·채점표·트랙·제출물 요건·투표) · 주제 승인 · 교수 권한(목록+등록+이력 한 화면) · 사용자 · 관리 이력
- **공지사항**

조교(role=STUDENT, 담당 있음)는 "내 팀" 옆에 **주제 관리(읽기)** 진입 유지.

## 5. 페이지 통합 매핑

처리 구분: **유지** / **통합**(다른 화면으로 흡수, 라우트 삭제) / **삭제**(별칭) / **라벨**(경로 유지·이름만).

| 현재 라우트 | 처리 | 신규 위치 / 비고 |
|---|---|---|
| `/`, `/onboarding` | 유지 | 로그인 / 학생 최초 입력 |
| `/sign-in` | 유지 | 인증 진입 리다이렉트(별칭 아님, 존치) |
| `/account` + `/account/profile` | 통합 | `/account` 한 화면(요약 + 지원정보 편집 인라인/탭). `/account/profile` 라우트 삭제 |
| `/notifications`, `/feedback` | 유지 | `/feedback`은 **로그인 후 진입로 추가**(계정 메뉴) + 인증 인지 |
| `/topics`, `/topics/[topicId]`, `/topics/archive/[projectId]` | 유지·라벨 | 둘러보기. 상위 라벨 "둘러보기"로 |
| `/projects/new` | 유지 | 학생 제안(비학생 → 교수 등록으로 redirect 유지) |
| `/programs`, `/programs/[id]/vote`, `/archive`, `/topics/applications` | 삭제 | 죽은 별칭 |
| `/dashboard` | 유지·라벨 | 역할별 화면 유지, 라벨을 역할에 맞게(학생=작업공간 진입, 교수=지도 현황, 관리자=전체 현황) |
| `/teams/[teamId]`(+`/tasks`,`/discussion`,`/requests`,`/reports`,`/artifacts`) | 유지 | "내 팀 > 작업공간" 아래. 권한은 기존 서비스 |
| `/recruitments` | 유지 | "내 팀 > 팀 꾸리기 > 모집 둘러보기" |
| `/recruitments/mine` | 통합/유지 | "팀 꾸리기 > 내 모집" 탭 |
| `/recruitments/applications` | 통합/유지 | "팀 꾸리기 > 내 지원 현황" 탭 |
| `/recruitments/[postId]/applications` | 유지 | 지원자 검토(딥) |
| `/teams` | 통합/유지 | "팀 꾸리기 > 내 팀 만들기·관리" |
| `/teams/manage/[teamId]` | 유지 | 팀 상세 관리(딥) |
| `/recruitments/new`, `/teams/new`, `/teams/invitations` | 삭제 | 모달 별칭 → 실제 화면 내 버튼으로 |
| `/project-approvals`(+`/[requestId]`) | 유지 | 교수="주제 관리 > 학생 제안", 관리자="운영 관리 > 주제 승인" |
| `/professor/topics`(+`/new`,`/[id]`,`/edit`,`/schedule`,`/assistants`) | 유지 | "주제 관리 > 내 주제" |
| `/professor/applications`(+`/[id]`) | 유지 | "주제 관리 > 받은 지원서" |
| `/announcements`(+상세·`/new`·`/edit`) | 유지 | 공지사항 |
| `/admin/programs`, `/admin/programs/new` | 유지 | 프로그램 목록·생성 |
| `/admin/programs/[id]/settings`,`/rubric`,`/tracks`,`/reports` | 통합 | `/admin/programs/[id]` 상세 안 **탭**(`?tab=settings\|rubric\|tracks\|reports`). 개별 `page.tsx` 삭제 |
| `/admin/programs/[id]/votes` | 삭제 | 별칭 |
| `/admin/professors` + `/new` + `/history` | 통합 | `/admin/professors` 한 화면(목록 + 등록 인라인 + 이력 탭). `/new`,`/history` 라우트 삭제 |
| `/admin/users`, `/admin/audit` | 유지 | 사용자 / 관리 이력 |

## 6. 삭제 목록

- 별칭 라우트 9개: `/programs`, `/programs/[id]/vote`, `/archive`, `/topics/applications`, `/recruitments/new`, `/teams/new`, `/teams/invitations`, `/admin/programs/[id]/votes` (+ 모달 별칭). `/sign-in`은 존치.
- 통합으로 사라지는 라우트: `/account/profile`, `/admin/professors/new`, `/admin/professors/history`, 프로그램 설정 4개(탭 흡수).

## 7. 폐기/수정할 테스트

- **삭제**: `tests/routes/integration/route-responsibility-splits.test.tsx` (규칙 폐기).
- **수정**: 삭제/통합 라우트를 참조하는 라우트 테스트, 나눠진 화면 단언(교수 등록/이력 분리, 계정 요약/편집 분리), `app-shell` 네비 항목·활성 판정 테스트.
- **신규 문자열**: 바뀐 라벨·탭 이름은 `src/shared/i18n/ui-messages.en.json`에 등록(로컬라이제이션 테스트 통과).

## 8. 네이밍 규칙

- 상위 라벨: 둘러보기 / 내 팀 / 지도 현황 / 주제 관리 / 전체 현황 / 운영 관리 / 공지사항.
- `applications` 화면은 맥락별 사람 말 라벨로: "학생 제안"(주제 승인) · "받은 지원서" · "모집 지원자" · "내 지원 현황". (라우트 경로 자체 rename은 저우선·선택 — 링크/히스토리 churn 커서 이번 범위 밖 권장.)
- `/dashboard` 라벨은 역할별로 명확히(위 4절).

## 9. 구현 단계 (각 단계 = 독립 PR 지향)

- **Phase 0 — 정리(저위험)**: 별칭 9개 삭제 + `route-responsibility-splits` 테스트 삭제. 깨지는 링크 정리.
- **Phase 1 — 계정·교수권한 통합**: `/account`(요약+편집), `/admin/professors`(목록+등록+이력). 관련 테스트 수정.
- **Phase 2 — 프로그램 설정 탭화**: `/admin/programs/[id]` 상세에 설정·채점표·트랙·제출물 요건·투표 탭(`?tab=`). 4개 개별 `page.tsx` 삭제·흡수.
- **Phase 3 — 학생 "내 팀" 재편(최대·주의)**: recruitments+teams를 "내 팀" 부모 + 작업공간/팀 꾸리기 탭으로. 권한 서비스 유지, 네비·활성 판정 재작성.
- **Phase 4 — 교수 "주제 관리" / 관리자 "운영 관리" 그룹화**: professor-sidebar·admin-sidebar 재편, project-approvals 편입.
- **Phase 5 — 라벨/네이밍 마감**: dashboard 역할 라벨, applications 라벨, `/feedback` 인앱 진입로.
- **(별도) 톤/비주얼**: 구조 안정화 후 impeccable new-work로 새 디자인 월드 탐색.

## 10. 리스크 / 미결

- Phase 3(팀 재편)이 최대 리스크: 팀 워크스페이스 접근이 role 리다이렉트가 아닌 `TeamWorkspaceQueryService`로 통제되고, 관련 모듈이 자주 변경됨. 네비/활성 판정·모달 별칭 제거가 광범위.
- 다수 라우트/라벨 테스트가 깨질 것 — 각 Phase에서 함께 갱신.
- 별칭 완전 삭제로 외부 공유 링크가 있으면 404(사용자 수용).
- 미결: `/dashboard` 역할별 3화면을 유지하되 URL을 나눌지(예: `/my/*`)는 저우선 — 이번엔 유지.
