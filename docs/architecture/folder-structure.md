# Production folder structure

이 저장소는 Next.js App Router와 도메인 중심 모듈 구조를 함께 사용한다. 폴더 위치는 코드의 책임과 재사용 범위를 드러내야 한다.

## Top-level layout

```text
src/
├── app/                 # 라우팅과 화면 조립
├── modules/             # 업무 도메인별 코드
├── shared/              # 도메인에 종속되지 않는 공통 코드
└── generated/           # Prisma 등 생성 코드, 직접 수정 금지
tests/
├── architecture/        # 구조와 의존성 규칙
└── routes/              # 라우트 단위 통합 테스트
```

운영 스크립트는 `scripts/`, 데이터베이스 스키마와 마이그레이션은 `prisma/`, 정적 파일은 `public/`, 장기 문서는 `docs/`에 둔다.

## `src/app`: routing and composition

라우트 세그먼트의 첫 깊이에는 Next.js가 직접 해석하는 예약 파일만 둔다.

```text
src/app/topics/
├── page.tsx
├── loading.tsx          # 필요한 라우트에만 둔다
├── error.tsx            # 필요한 라우트에만 둔다
├── _components/         # 해당 라우트 트리 전용 React 컴포넌트
├── _actions/            # Server Actions와 입력 경계
└── _lib/                # 화면 조회 조립, 상태 모델, 순수 유틸리티
```

- `page.tsx`, `layout.tsx`, `route.ts`는 인증, 서비스 조립, 렌더링 위임만 담당한다.
- `_components`는 해당 라우트 트리 밖에서 재사용하지 않는다. 재사용 범위가 넓어지면 도메인 UI는 `src/modules/<domain>/ui`, 범용 UI는 `src/shared/ui`로 승격한다.
- 여러 최상위 라우트를 조립하면서 도메인 UI를 연결하는 앱 셸은 `src/app/_components`에 둔다. `shared`가 도메인 모듈을 역참조하게 만들지 않는다.
- `_actions`는 HTTP/FormData를 애플리케이션 입력으로 변환한다. 업무 규칙을 직접 구현하지 않는다.
- `_lib`는 라우트 전용 조회 조립과 표현 모델만 둔다. 도메인 정책을 두지 않는다.
- 밑줄로 시작하는 private folder를 사용해 URL 세그먼트와 구현 세부사항을 명확히 구분한다.
- 라우트 통합 테스트는 `tests/routes`, 컴포넌트와 순수 로직 테스트는 대상 파일 옆에 둔다.

## `src/modules`: domain boundaries

```text
src/modules/<domain>/
├── domain/              # 엔티티, 값 객체, 정책. 프레임워크 의존 금지
├── application/         # 유스케이스, 포트, 트랜잭션 경계
├── infrastructure/      # Prisma, 외부 API, 저장소 구현
└── ui/                  # 여러 라우트에서 재사용하는 도메인 UI/입력 변환
```

의존 방향은 `ui/infrastructure -> application -> domain`이다. `domain`은 `app`, `shared/infrastructure`, Prisma 및 React를 import하지 않는다. 라우트는 인프라 구현을 조립할 수 있지만 업무 규칙은 애플리케이션 서비스로 위임한다.

## `src/shared`: cross-domain code

- `shared/ui`: 브랜드, 앱 셸, 범용 폼·피드백 컴포넌트
- `shared/infrastructure`: 데이터베이스, 오브젝트 스토리지 등 공통 어댑터
- `shared/http`: 도메인과 무관한 HTTP 안전장치

특정 업무 용어가 들어간 코드는 `shared`에 두지 않는다. 두 곳에서 사용된다는 이유만으로 공통화하지 않고, 소유 도메인이 명확하면 해당 `modules`에 둔다.

## Naming rules

- `actions.ts`, `utils.ts`, `helpers.ts`처럼 검색 결과만으로 책임을 알 수 없는 이름을 피한다.
- 서버 액션은 `<feature>-actions.ts`, 상태 모델은 `<feature>-state.ts`, 조회 조립은 `<feature>-query.ts`처럼 의도를 포함한다.
- barrel `index.ts`는 순환 의존성과 불필요한 공개 API를 만들기 쉬우므로 기본적으로 사용하지 않는다.
- 생성 파일과 마이그레이션은 수동으로 재배치하거나 수정하지 않는다.

## Adding a feature

1. 업무 규칙과 유스케이스를 소유할 `modules/<domain>`을 먼저 결정한다.
2. URL과 접근 권한을 소유할 `app` 라우트를 만든다.
3. 라우트 전용 코드는 private folder에 두고, 라우트 파일은 조립만 담당하게 유지한다.
4. 재사용이 실제로 발생할 때만 `modules/<domain>/ui` 또는 `shared/ui`로 승격한다.
5. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`로 경계와 프로덕션 빌드를 확인한다.
