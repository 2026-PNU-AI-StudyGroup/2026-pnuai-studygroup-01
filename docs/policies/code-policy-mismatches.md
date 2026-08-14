# 정책·구현 불일치 감사

이 문서는 현재 유효 정책 문서와 현재 작업 트리의 코드·스키마·운영 문서를 대조해 확인한 차이만 기록한다. 테스트는 근거로 사용하지 않았고, 시드 데이터는 현재 모델과 충돌하는 새 기록을 생성하는 경우에만 함께 확인했다.

- 대조 기준일: 2026-08-14
- 코드 기준: 현재 작업 트리의 `prisma/schema.prisma`, `src/modules`, `src/app` Server Action·Route Handler, `scripts`, 운영 문서
- 이 문서는 정책을 새로 결정하지 않는다. 각 항목은 정책을 문서대로 구현할지, 실제 구현을 정책으로 채택할지를 결정하기 위한 목록이다.

## 대조 완료 범위

- 유효 정책: `docs/policies`의 정책 6종과 정책 인덱스·확인 필요 정책
- 현재 안내·운영: `README.md`, `docs/LOCAL_DEVELOPMENT.md`, `docs/PRODUCTION.md`, `docs/architecture/folder-structure.md`, `docs/design/README.md`
- 과거 설계·계획: `PRODUCT.md`, `DESIGN_IMPLEMENTATION_PLAN.md`, `docs/superpowers`의 IA 스펙·계획
- 부속 문서: `public/fonts/pretendard/README.md`

라이선스·폰트 무결성 정보처럼 제품 동작을 정의하지 않는 부속 정보는 대상 파일·참조가 현재 존재하는지만 확인했다. 과거 설계·계획은 현재 정책과 다를 수 있으므로, 내용 자체보다 현재 기준과 구분되는지에 집중해 기록했다.

## 요약

| ID | 구분 | 영향 | 현재 차이 |
| --- | --- | --- | --- |
| M-01 | 코드가 정책을 어김 | 높음 | 프로젝트 내용 수정으로 모집 여부를 바꿀 수 있다. |
| M-02 | 코드가 정책을 어김 | 높음 | 종료된 프로그램에서도 모집 마감 처리가 가능하다. |
| M-03 | 코드가 정책을 어김 | 높음 | 종료된 프로젝트가 있어도 교수 권한 회수를 막는다. |
| M-04 | 코드가 정책을 어김 | 높음 | 학생 전화번호가 `User.phoneNumber`와 별도 프로필 값으로 나뉘어 저장된다. |
| M-05 | 화면과 정책 한도 차이 | 낮음 | 프로젝트 설명 입력칸은 10,000자를 허용하지만 정책·서버 한도는 8,000자다. |
| M-06 | 코드가 정책을 어김 | 중간 | 프로젝트에서 나간 구성원도 같은 팀의 프로필 사진을 계속 볼 수 있다. |
| M-07 | 코드가 정책을 어김 | 중간 | 종료되었거나 구성 중인 팀에도 새 보고서 정의를 할당한다. |
| M-08 | 코드가 정책을 어김 | 높음 | 새 프로그램 구성원 전용·팀 전용 공지를 만들 수 있다. |
| M-09 | 폐기한 팀 종료 기록을 새 시드가 생성함 | 중간 | 상태 없는 프로젝트 팀 모델과 달리 `TEAM_CLOSED` 감사 기록을 계속 만든다. |

## M-01. 프로젝트 내용 수정으로 모집 여부를 바꿀 수 있음

### 문서 기준

[프로그램과 프로젝트 운영](programs-and-projects.md)의 `프로젝트 수정과 모집 종료`는 내용 편집이 모집을 시작하거나 종료하는 수단이 아니며, 모집 종료는 전용 작업으로만 처리한다고 정한다.

### 실제 구현

- `src/modules/topic/ui/topic-form.tsx`는 편집 화면에 현재 모집 여부를 숨은 입력값으로 넣는다.
- `src/modules/topic/ui/create-topic-input.ts`는 그 값을 그대로 읽는다.
- `src/modules/topic/application/update-topic.ts`와 `src/modules/topic/infrastructure/prisma-topic-command-repository.ts`는 `recruitmentEnabled`를 일반 수정 데이터에 포함해 저장한다.

일반 화면에는 이 값을 바꾸는 스위치가 없지만, Server Action으로 보내는 폼 데이터는 신뢰할 수 없으므로 숨은 입력값만으로 정책을 강제할 수 없다. 내용 수정 요청에서 값을 바꾸면 모집 시작·종료가 가능하다.

### 정리 방향

문서 정책을 유지한다면 수정용 입력 형식에서 모집 여부를 빼고, 저장소도 기존 값을 보존해야 한다. 모집 종료 전용 작업만 이 값을 바꾸어야 한다.

## M-02. 종료된 프로그램에서도 모집 마감 처리가 가능함

### 문서 기준

[프로그램과 프로젝트 운영](programs-and-projects.md)은 모집 마감을 “프로그램 종료 전의 진행 중인 프로젝트”에만 허용한다.

### 실제 구현

- `src/modules/topic/application/change-topic-status.ts`는 저장된 프로젝트 상태가 `ACTIVE`인지와 현재 모집 여부만 확인한다.
- `src/modules/topic/infrastructure/prisma-topic-command-repository.ts`의 `closeRecruitment` 갱신 조건에도 프로그램 `endsAt`이 없다.
- `src/app/professor/topics/[topicId]/page.tsx`와 `src/app/professor/topics/_components/topic-status-button.tsx`도 파생 종료 상태가 아니라 저장된 `ACTIVE` 상태를 받아 마감 버튼을 판단한다.
- 이 작업은 대기 지원을 미선정하고, 실행 팀 모집 글과 대기 지원도 닫는다.

프로그램 종료 뒤에도 프로젝트의 저장 상태는 `ACTIVE`로 남는 설계이므로, 위 경로는 종료된 프로젝트에도 동작한다. 종료 후에는 완료·취소 상태를 화면에서 파생할 뿐, 이 전용 작업의 DB 조건에는 반영하지 않는다.

### 정리 방향

서비스와 저장 트랜잭션 모두 `program.endsAt > 처리 시각`을 조건으로 확인하고, 종료 프로젝트에는 마감 버튼도 노출하지 않아야 한다.

## M-03. 교수 권한 회수의 종료 판정이 정책과 다름

### 문서 기준

[계정과 접근 권한](identity-and-access.md)은 담당하는 **종료 전** 프로젝트나 활성 실행 팀이 없을 때 교수 권한을 회수할 수 있다고 정한다.

### 실제 구현

`src/modules/identity/infrastructure/prisma-professor-access-repository.ts`는 담당 프로젝트의 저장 상태가 `ACTIVE`인지만 세고 프로그램 종료 시각은 확인하지 않는다. 종료 프로그램의 완료 프로젝트도 저장 상태가 `ACTIVE`로 남으므로, 문서상 종료된 프로젝트가 있어도 권한 회수가 거절된다.

같은 방식의 집계가 `src/modules/identity/infrastructure/prisma-user-administration-repository.ts`의 교수 계정 비활성화 화면에도 사용된다. 따라서 화면의 “담당 프로젝트 수”도 종료 상태를 반영하지 못한다.

### 정리 방향

종료 전 책임 여부를 판단하는 모든 집계에 `program.endsAt > 처리 시각`을 같은 기준으로 넣어야 한다. 프로젝트 저장 상태만으로 종료 여부를 판단하면 안 된다.

## M-04. 학생 전화번호의 저장 위치와 검증 기준이 정책과 다름

### 문서 기준

[계정과 접근 권한](identity-and-access.md)은 전화번호의 단일 저장 원본을 `User.phoneNumber`로 정하고, 온보딩과 계정 연락처 수정이 같은 값을 읽고 갱신한다고 정한다. 전화번호는 필수이고 숫자 8~15자리 형식을 사용한다.

### 실제 구현

- `src/modules/identity/infrastructure/prisma-student-profile-repository.ts`는 연락처 화면의 전화번호를 `StudentProfile.phone`에 따로 저장한다.
- `src/modules/identity/domain/student-profile.ts`는 빈 값도 허용하고, 공백·괄호·하이픈을 포함한 최대 40자 형식을 사용한다.
- `src/modules/identity/infrastructure/prisma-student-onboarding-repository.ts`는 온보딩 전화번호를 `User.phoneNumber`에 저장한다.

따라서 온보딩에서 받은 필수 전화번호와 계정 연락처 화면에서 수정한 전화번호가 서로 다른 값으로 남을 수 있다.

### 정리 방향

문서 정책을 유지한다면 연락처 프로필의 전화번호 필드를 없애고, 프로필 조회·수정도 `User.phoneNumber`를 사용해야 한다. 기존 `StudentProfile.phone` 데이터는 이관 기준을 정한 뒤 한 번만 정리해야 한다.

## M-05. 프로젝트 설명 입력칸의 한도가 서버·정책과 다름

### 문서와 서버 기준

[프로그램과 프로젝트 운영](programs-and-projects.md)과 `src/modules/topic/domain/topic-policy.ts`, `src/modules/topic/ui/create-topic-input.ts`는 프로젝트 설명을 최대 8,000자로 제한한다.

### 실제 구현

`src/modules/topic/ui/topic-form.tsx`의 설명 입력칸은 `maxLength={10000}`이다. 사용자는 8,001~10,000자를 입력할 수 있지만 제출 때 서버 검증에서 거절된다.

### 정리 방향

화면 한도를 8,000자로 맞춰 입력 단계에서 같은 기준을 보여줘야 한다.

## M-06. 프로젝트 구성 종료 뒤에도 프로필 사진 열람이 남음

### 문서 기준

[계정과 접근 권한](identity-and-access.md)은 프로필 사진을 본인·관리자 또는 **같은 실행 팀의 현재 관계자**(팀원·담당교수·조교)만 볼 수 있다고 정한다. 프로젝트 팀에서 나가면 프로젝트 권한을 즉시 회수한다는 [팀과 프로젝트 공간](teams-and-workspaces.md)의 규칙도 같은 범위다.

### 실제 구현

`src/modules/identity/infrastructure/prisma-profile-image-repository.ts`의 관계 조회는 사진 소유자의 `ProjectTeamMembership`에 `endedAt: null` 조건을 넣지 않는다. 사진 소유자가 과거에 속했던 팀에 현재 조회자가 남아 있으면, 탈퇴·제외·계정 탈퇴로 구성 관계가 끝난 뒤에도 사진을 조회할 수 있다.

### 정리 방향

프로젝트 팀 멤버십으로 사진을 허용할 때 사진 소유자와 조회자 모두의 활성 멤버십을 확인해야 한다. 종료된 멤버십은 접근 근거로 사용하면 안 된다.

## M-07. 보고서 정의 변경이 종료·구성 중 팀에도 적용됨

### 문서 기준

[보고서·결과물·평가](deliverables-and-evaluation.md)은 새 보고서 정의를 **종료되지 않은 기존 실행 팀**에만 할당하고, 이력이 있는 정의를 보관할 때도 종료되지 않은 팀에서만 필수 대상을 뺀다고 정한다.

### 실제 구현

`src/modules/report/infrastructure/prisma-program-report-definition-repository.ts`는 보고서 정의 생성·수정·보관에서 프로젝트의 저장 상태가 `ACTIVE`인지만 확인한다. 프로그램 `endsAt`과 `ProjectTeam.confirmedAt`을 확인하지 않는다.

프로그램이 끝난 완료 프로젝트도 저장 상태가 `ACTIVE`로 남고, 구성 중 팀도 같은 상태를 사용한다. 따라서 새 정의가 완료 프로젝트와 구성 중 팀에 할당되고, 정의 수정·보관도 그 팀의 보고서에 반영된다.

### 정리 방향

보고서 정의를 팀에 적용하거나 필수 여부를 바꿀 때는 `confirmedAt`이 있고 프로그램 종료 전인 팀만 대상으로 제한해야 한다. 완료 프로젝트의 보고서 이력은 관리자 설정 변경 때문에 바뀌면 안 된다.

## M-08. 새 구성원 전용·팀 전용 공지를 만들 수 있음

### 문서 기준

[공지·알림·번역·피드백](communication-and-operations.md)은 새 팀 전용 공지와 새 프로그램 구성원 전용 공지를 작성하지 않으며, 새 프로그램 공지는 로그인 사용자 전체 공개로만 작성한다고 정한다. 구성원 전용 공지는 목데이터로 남은 기존 데이터만 유지하는 대상이다.

### 실제 구현

- `src/modules/announcement/application/manage-announcements.ts`는 `teamId`가 있으면 새 공지를 `TARGET_MEMBERS`로 정규화하고, 프로그램 공지는 요청한 공개 범위를 그대로 허용한다.
- 같은 서비스의 대상 권한 확인은 담당 팀·프로그램인지 여부만 확인하므로, 교수와 관리자가 새 팀 전용 및 프로그램 구성원 전용 공지를 저장할 수 있다.
- `src/modules/announcement/ui/program-announcement-create-modal.tsx`와 `src/app/announcements/_components/announcement-form.tsx`도 프로그램 구성원 전용 공개 범위를 선택할 수 있게 제공한다.

이는 과거 제한 공지를 읽을 수 있게 보존하는 것과 별개로, 새 제한 공지를 계속 만드는 구현이다.

### 정리 방향

현재 정책을 유지한다면 새 공지의 대상 선택에서 팀을 제거하고, 프로그램 공지는 `AUTHENTICATED`로 고정해야 한다. 서버 서비스에서도 팀 대상과 `TARGET_MEMBERS` 프로그램 공지를 거절해 UI 우회 저장을 막아야 한다.

## M-09. 폐기한 팀 종료 기록을 새 시드가 생성함

### 문서와 모델 기준

[정책 인덱스](README.md)와 [팀과 프로젝트 공간](teams-and-workspaces.md)은 프로젝트 팀에 별도 종료 상태가 없고, 프로젝트 종료는 프로그램의 종료일로만 파생된다고 정한다. 프로젝트 팀은 끝나는 객체가 아니라 구성원 이력을 가진 집합이다.

### 실제 구현

- `prisma/schema.prisma`의 감사 작업 enum에 이전 모델의 `TEAM_CONFIRMED`, `TEAM_CLOSED`가 남아 있다.
- `scripts/seed-demo-data.ts`는 종료 프로그램의 각 팀에 `TEAM_CLOSED`, 대상 유형 `TEAM` 감사 기록을 새로 넣는다.

실제 실행 경로는 `PROJECT_TEAM_CONFIRMED`와 구성원 변경 기록을 사용한다. 그러나 새로 만든 시드 데이터가 폐기한 팀 종료라는 일을 기록하므로 관리 감사 화면에서 현재 모델과 다른 이력을 보여 준다.

### 정리 방향

과거 운영 데이터 호환 때문에 enum 값을 보존해야 한다면 읽기 전용 과거 기록으로만 남긴다. 새 시드에서는 `TEAM_CLOSED`를 만들지 않고, 프로그램 종료 처리의 시스템 감사 기록 또는 보고서 승인 기록만 생성해야 한다.

## 후속 처리 원칙

- 남은 항목은 모두 코드·시드 수정 대상이다. `M-01`~`M-04`, `M-06`~`M-09`는 확정 정책의 권한·수명주기·접근 범위를 어기는 항목이다.
- `M-05`는 화면 입력 한도만 서버와 정책에 맞추면 된다.
