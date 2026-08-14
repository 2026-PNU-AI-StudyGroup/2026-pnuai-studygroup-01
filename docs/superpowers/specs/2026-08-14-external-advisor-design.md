# 외부자문위원(External Advisor) 설계

날짜: 2026-08-14
상태: 사용자 승인 대기
브랜치: `feat/external-advisor`

## 목적

교외 인원이 해커톤·대회에 자문위원으로 참여한다. 할당된 팀(프로젝트)의 결과물·보고서를 열람·다운로드하고, 자문위원별 독립 채점표로 점수를 남기고, 팀에게 보이는 피드백을 작성한다. 투표에도 참여한다.

## 확정 요구사항

| 항목 | 결정 |
|---|---|
| 로그인 | 초대 링크(토큰). 비밀번호 없음. 관리자가 링크 복사해 직접 전달 |
| 신원 모델 | 정식 `User`(role=`ADVISOR`) — 파일/보고서 다운로드가 로그인 User 전제라 통합이 자연스러움 |
| 점수 | 자문위원별 독립 채점표. 프로그램 루브릭 항목(항목·배점) 재사용. 운영진 채점과 분리 저장·집계 |
| 열람(할당 팀) | 프로젝트 소개 + 결과물 + 보고서(다운로드 포함). 팀 내부(대화·할일·회의)는 비공개 |
| 열람(비할당 팀) | 공개 결과물 페이지만(지난 프로젝트 상세 쇼케이스). CLOSED 팀 공개 파일 다운로드는 기존 규칙이 이미 허용 |
| 노출 | 점수 = 관리자·지도교수만. 피드백 = 팀원도 열람 |
| 투표 | 자문위원·관리자 투표 가능. 한도는 역할별 분리: 학생 = 기존 `voteLimit`, 자문위원·관리자 = `staffVoteLimit`(기본 5, 설정 가능) |

## 데이터 모델 (마이그레이션 1개)

```prisma
enum UserRole { STUDENT PROFESSOR ADMIN ADVISOR }   // ADVISOR 추가

model AdvisorAccessToken {
  id        String    @id @default(uuid())
  userId    String                       // 자문위원 User
  tokenHash String    @unique            // sha256(원문). 원문은 DB에 저장하지 않음
  expiresAt DateTime                     // 기본 발급일 +90일
  revokedAt DateTime?
  createdAt DateTime  @default(now())
}

model ProjectAdvisor {                    // ProjectAssistant 미러(팀 할당)
  id          String   @id @default(uuid())
  topicId     String
  userId      String
  grantedById String
  createdAt   DateTime @default(now())
  @@unique([topicId, userId])
}

model AdvisorEvaluation {                 // 위원 1명당 팀·루브릭별 채점표 1장
  id        String   @id @default(uuid())
  teamId    String
  advisorId String
  rubricId  String
  createdAt DateTime @default(now())
  @@unique([teamId, advisorId, rubricId])
}

model AdvisorScore {
  id           String @id @default(uuid())
  evaluationId String
  criterionId  String                    // 기존 RubricCriterion 재사용
  points       Int
  @@unique([evaluationId, criterionId])
}

model AdvisorFeedback {                   // 팀 단위 자유 피드백(마크다운)
  id        String   @id @default(uuid())
  teamId    String
  advisorId String
  body      String
  createdAt DateTime @default(now())
}

// ProgramVotingPolicy에 추가
staffVoteLimit Int @default(5)            // 자문위원·관리자 투표 한도
```

## 인증·초대 흐름

1. 관리자: 자문위원 등록(이름·이메일) → `User(role=ADVISOR)` 생성 + 토큰 발급 → 초대 링크 복사
2. 자문위원: `/advisor/access/[token]` 접속 → 해시 대조·만료·회수 확인 → better-auth 세션 생성(내부 어댑터, 커스텀 라우트) → `/advisor` 이동
3. 링크는 기간 중 재사용 가능(1회용 아님 — 행사용 편의 우선). 관리자가 재발급(기존 revoke + 신규 발급)·회수 가능
4. 만료·회수 토큰 → 안내 페이지("관리자에게 재발급을 요청하세요")

## 화면

### 자문위원 (`/advisor`)
- 담당 프로젝트 목록(팀명·주제·프로그램 카드)
- 프로젝트 상세: 소개 / 결과물(영상·이미지 열람, 파일 다운로드) / 보고서(목록+다운로드) / 채점표(루브릭 항목별 점수, 수정 가능) / 피드백 작성(복수)
- 네비게이션: **담당 프로젝트** + **프로젝트 찾기**(`/topics` — 전체 팀 쇼케이스 열람·투표) 2개만

### 관리자 (프로그램 관리 "자문위원" 탭)
- 위원 등록·목록·초대링크 복사·재발급·회수
- 위원별 팀 할당(체크박스)
- 점수 집계(팀×위원 매트릭스 + 평균)

### 팀(학생)
- 평가 탭에 "자문위원 피드백" 섹션(작성자명+내용). 점수는 비노출

## 접근 제어

- `/api/files`·보고서 다운로드: advisor 분기 추가 — 할당된 topic의 팀 파일만(ARTIFACT·REPORT)
- ADVISOR는 학생·교수·관리자 화면 접근 불가. 기존 3역할(`"STUDENT"|"PROFESSOR"|"ADMIN"`) 유니온 가정 코드는 tsc 오류로 전수 정리
- 채점·피드백 쓰기 = ADVISOR 본인 + 할당 팀. 프로그램 종료일(`endsAt`)까지 가능(팀 CLOSED 여부와 무관, 종료 후엔 열람만)
- 점수 열람 = ADMIN·지도교수. 피드백 열람 = +팀원
- 투표 자격에 ADVISOR·ADMIN 포함, 한도만 역할별 분기

## 엣지 케이스

- 할당 해제된 팀: 목록에서 제거, 기존 점수·피드백은 보존(집계 유지)
- 토큰 만료/회수 후 접속: 안내 페이지
- 루브릭이 없는 프로그램: 채점표 대신 "채점표가 준비되지 않았습니다" 표시(피드백은 가능)
- 동일 이메일 재등록: 기존 ADVISOR User 재사용 + 새 토큰

## 테스트

- 토큰 검증(해시·만료·회수) 단위 테스트
- 접근 제어: 비할당 팀 404, 학생/교수 화면 차단, 파일 라우트 advisor 분기
- 채점표 unique(팀·위원·루브릭), 점수 범위(0~배점)
- 투표 한도 역할별 분기(학생 voteLimit, 위원·관리자 staffVoteLimit)
- 페이지 렌더(/advisor 목록·상세, 관리자 탭)
