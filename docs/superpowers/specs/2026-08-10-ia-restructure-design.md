# 정보구조(IA) 설계

## 공통 구조

- 상단 공통 기능은 알림(`/notifications`)과 계정 메뉴를 사용한다.
- 프로젝트 탐색과 프로그램 운영 설정은 분리한다.
- 프로젝트 목록 조건만 `/topics`의 쿼리스트링으로 표현한다.
- 관리자 프로그램 설정은 `/topics/manage` 하위 경로로 표현한다.

## 역할별 1단계 메뉴

### 학생

1. 프로젝트 찾기
2. 내 프로젝트
3. 팀 모집
4. 공지사항

### 교수

1. 프로젝트 찾기
2. 지도 현황
3. 공지사항
4. 주제 관리

### 관리자

1. 프로젝트 찾기
2. 프로젝트 승인
3. 공지사항
4. 운영 관리

관리자의 `프로젝트 승인`은 전역 승인 대기함이다. `운영 관리`는 프로그램 설정, 교수 권한, 사용자, 이메일 전송, 관리 이력을 포함한다.

## 프로젝트 탐색

| 주소 | 화면 |
|---|---|
| `/topics` | 진행 중 프로젝트 |
| `/topics?view=past` | 지난 프로젝트 |
| `/topics?programId=<id>` | 선택 프로그램의 진행 중 프로젝트 |
| `/topics?view=past&programId=<id>` | 선택 프로그램의 지난 프로젝트 |
| `/topics/<topicId>` | 진행 중 프로젝트 상세 |
| `/topics/archive/<projectId>` | 지난 프로젝트 상세 |

`view`와 `programId`는 탐색 문맥이다. `q`, `divisionId`, `operation`, `page`는 목록 조건이다. 조건 초기화는 탐색 문맥을 유지하고 목록 조건만 제거한다.

## 관리자 프로그램 관리

| 주소 | 화면 |
|---|---|
| `/topics/manage/new` | 프로그램 생성 |
| `/topics/manage/<programId>` | 설정 |
| `/topics/manage/<programId>/rubric` | 채점표 |
| `/topics/manage/<programId>/tracks` | 분과 |
| `/topics/manage/<programId>/reports` | 보고서 |
| `/topics/manage/<programId>/votes` | 투표 |

- 설정은 추가 세그먼트가 없는 기본 화면이다.
- 프로그램을 전환하면 현재 관리 탭을 유지한다.
- `/settings`, 알 수 없는 탭, 여러 단계의 잘못된 탭은 기본 설정 주소로 정규화한다.
- 존재하지 않는 프로그램은 같은 탭의 기본 프로그램으로 이동한다.
- 프로그램이 없으면 `/topics/manage/new`로 이동한다.
- 프로그램별 프로젝트는 관리 탭에 복제하지 않고 `/topics?programId=<id>`에서 관리한다.
- 프로그램별 승인 대기 건수는 프로그램 사이드바와 관리 화면 제목에 표시하고 `/project-approvals?programId=<id>&status=PENDING`으로 연결한다.

## 승인 대기함

| 주소 | 화면 |
|---|---|
| `/project-approvals` | 역할별 승인 요청 목록 |
| `/project-approvals/<requestId>` | 승인 요청 상세 |

관리자는 프로그램과 상태로 목록을 필터링한다. 상세 진입과 목록 복귀 시 프로그램·상태·페이지 문맥을 유지한다.

## 관리자 운영 관리

| 주소 | 화면 |
|---|---|
| `/admin/professors` | 교수 권한 |
| `/admin/users` | 사용자 관리 |
| `/admin/emails` | 이메일 전송 |
| `/admin/audit` | 관리 이력 |

관리자 프로그램 관리 경로와 `/admin/*`, 관리자용 `/professor/*` 경로에서는 `운영 관리` 메뉴를 활성화한다. `/topics/manage/*`에서는 `프로젝트 찾기`를 동시에 활성화하지 않는다.

## 대시보드

- 학생과 교수의 `/dashboard`는 각 역할의 프로젝트 화면으로 유지한다.
- 관리자의 `/dashboard`는 `programId`만 보존해 `/topics`로 이동한다.

## 제거된 관리자 구조

- 관리자 전용 전체 프로젝트 집계 화면
- 프로그램 관리의 현황 탭과 진행 구간 필터
- `/admin/programs`와 모든 하위 라우트

기존 관리자 프로그램 쿼리 주소는 새 정식 주소로만 이동한다. 과거 현황 주소는 선택 프로그램의 `/topics?programId=<id>`로 이동한다.
