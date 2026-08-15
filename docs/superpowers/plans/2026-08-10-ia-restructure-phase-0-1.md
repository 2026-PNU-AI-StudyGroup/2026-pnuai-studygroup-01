# IA 재구조 Phase 0–1 구현 계획

> [!WARNING]
> 2026-08-10 시점의 역사 작업 계획입니다. 현재 경로·정책·구현 기준이 아니며, 작업 전에는 [`docs/policies/README.md`](../../policies/README.md)와 현재 코드를 확인합니다.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans 로 태스크 단위 실행. 스텝은 체크박스(`- [ ]`).

**Goal:** 죽은 별칭 라우트를 제거하고, 강제 분리됐던 계정·교수권한 화면을 각각 한 화면으로 통합한다.

**Architecture:** 라우팅/UI 층만 변경. 도메인·서비스(ProfessorAccessService, StudentProfileService)는 그대로 재사용. 통합은 기존 컴포넌트를 한 페이지에 모으는 방식.

**Tech Stack:** Next.js 16 App Router(RSC), Tailwind, Vitest + Testing Library, i18n(ui-messages.en.json).

관련 스펙: [2026-08-10-ia-restructure-design.md](../specs/2026-08-10-ia-restructure-design.md)

---

## Phase 0 — 정리 (별칭·강제분리 테스트 삭제)

### Task 0.1: 죽은 별칭 라우트 삭제

**Files (삭제):**
- `src/app/programs/page.tsx`
- `src/app/programs/[programId]/vote/page.tsx`
- `src/app/archive/page.tsx`
- `src/app/topics/applications/page.tsx`
- `src/app/recruitments/new/page.tsx`
- `src/app/teams/new/page.tsx`
- `src/app/teams/invitations/page.tsx`

(각 파일은 `redirect(...)` 한 줄짜리 별칭. UI에서 href로 링크되지 않음을 grep으로 확인함. `/sign-in`은 존치.)

- [ ] **Step 1:** 위 7개 `page.tsx` 삭제. 빈 폴더도 함께 제거.
- [ ] **Step 2:** 참조처 수정:
  - `src/modules/student-team/ui/student-team-section-layout.tsx:45` — 활성 판정에서 `|| currentPath === "/recruitments/new"` 제거.
- [ ] **Step 3:** 남은 참조 없음 확인. Run: `git grep -nE "/(programs|archive|teams/new|teams/invitations|recruitments/new|topics/applications)\"" src` → 결과 0줄(단, `/recruitments/mine` 등 접두 유사 경로는 무시).
- [ ] **Step 4:** 타입 확인. Run: `npx tsc --noEmit` → 에러 0.

### Task 0.2: "화면당 책임 1개" 강제 테스트 삭제

**Files (삭제):** `tests/routes/integration/route-responsibility-splits.test.tsx`

- [ ] **Step 1:** 파일 삭제.
- [ ] **Step 2:** 전체 테스트 수집 에러 없는지 확인. Run: `npx vitest run tests/routes` → 삭제한 스위트만 사라지고 나머지 통과(기존 RED 목록 대비 신규 실패 0).
- [ ] **Step 3 (Commit):**
```bash
git add -A
git commit -m "refactor: 죽은 별칭 라우트 8개 및 화면분리 강제 테스트 제거"
```

---

## Phase 1 — 계정·교수권한 통합

### Task 1.1: 계정 화면 통합 (/account + /account/profile → /account)

학생 지원정보 편집을 `/account` 안으로 인라인. `/account/profile` 라우트와 탭 네비 제거.

**Files:**
- Modify: `src/app/account/page.tsx`
- Modify: `src/app/account/_components/account-section-layout.tsx`
- Delete: `src/app/account/profile/page.tsx` (+ 빈 폴더)

- [ ] **Step 1:** `account-section-layout.tsx` — `items` 탭 배열 제거(항상 빈 헤더). 즉 헤더는 "내 계정" 제목만 남기고 `UiNav` 블록 삭제. `role`/`currentPath` prop은 미사용이면 시그니처 정리(호출부 함께).
- [ ] **Step 2:** `account/page.tsx` — 학생 분기에서 "지원 정보 수정" `Link`(→/account/profile) 자리에, 요약 아래 `StudentProfileForm`을 직접 렌더. import 추가: `import { StudentProfileForm } from "@/app/account/_components/student-profile-form";`. 요약(작성완료/필요 상태)은 유지하되 편집을 같은 화면에서. `currentPath="/account"` 유지.
- [ ] **Step 3:** `account/profile/page.tsx` 삭제.
- [ ] **Step 4:** `/account/profile`로의 링크 잔재 grep·수정. Run: `git grep -n "/account/profile" src` → 0줄.
- [ ] **Step 5:** 타입·린트. Run: `npx tsc --noEmit && npx eslint src/app/account` → 0.

### Task 1.2: 교수 권한 화면 통합 (/admin/professors + /new + /history → /admin/professors)

목록 페이지에 등록 폼을 인라인 섹션으로, 변경 이력은 `?tab=history` 탭으로.

**Files:**
- Modify: `src/app/admin/professors/page.tsx`
- Delete: `src/app/admin/professors/new/page.tsx`, `src/app/admin/professors/history/page.tsx` (+ 빈 폴더)
- 재사용: `_components/professor-access-form.tsx`(등록 폼), `_components/revoke-professor-access-form.tsx`

- [ ] **Step 1:** `professors/page.tsx`를 `searchParams` 받는 형태로. `const tab = (await searchParams).tab === "history" ? "history" : "list";`
- [ ] **Step 2:** `AdminWorkspace` actions에 탭 링크 2개: "권한 목록"(`/admin/professors`) · "변경 이력"(`/admin/professors?tab=history`). 현재 탭 강조.
- [ ] **Step 3:** `tab === "list"`일 때: (a) `<AdminSection title="교수 이메일 등록">`에 `<ProfessorAccessForm />` 인라인, (b) 기존 `교수 권한 목록` 섹션. `/admin/professors/new`·`/history` 링크는 탭/인라인으로 대체.
- [ ] **Step 4:** `tab === "history"`일 때: `listAudit(actor)` 불러 기존 history 페이지의 `최근 권한 변경 기록` 섹션 렌더(그 JSX를 이 파일로 이전).
- [ ] **Step 5:** `professors/new/page.tsx`, `professors/history/page.tsx` 삭제.
- [ ] **Step 6:** 링크 잔재 grep. Run: `git grep -nE "/admin/professors/(new|history)" src` → 0줄.
- [ ] **Step 7:** i18n — 신규/변경 문구("교수 이메일 등록" 등 기존 키 재사용, 없으면) `src/shared/i18n/ui-messages.en.json` 등록. Run: `npx vitest run tests/architecture/ui-localization` → 신규 위반 0.
- [ ] **Step 8:** 타입·린트. Run: `npx tsc --noEmit && npx eslint src/app/admin/professors` → 0.

### Task 1.3: 검증 + 커밋

- [ ] **Step 1:** 관련 라우트 테스트 갱신(삭제된 페이지 import·별도화면 단언 제거). Run: `npx vitest run tests/routes` → 신규 실패 0.
- [ ] **Step 2:** 브라우저 확인(dev): `/account`(학생=요약+편집 한 화면), `/admin/professors`(폼+목록), `/admin/professors?tab=history`(이력). 콘솔 에러 0.
- [ ] **Step 3 (Commit):**
```bash
git add -A
git commit -m "refactor: 계정·교수권한 화면을 각각 한 화면으로 통합"
```

---

## 자기검토 메모
- 스펙 커버리지: Phase 0(별칭삭제·테스트삭제)·Phase 1(계정통합·교수권한통합) = 스펙 9절 Phase 0–1 대응. Phase 2–5는 이 계획 land 후 별도 문서.
- 리스크: 낮음. 도메인 미변경, 참조처 소수. account-section-layout prop 시그니처 변경 시 호출부(account/page + 삭제될 profile) 동기화 필요 — Step에 포함.
- UI 조립(Task 1.1 Step2, 1.2 Step3–4)은 기존 컴포넌트 재배치라 최종 JSX는 편집 중 확정(신규 로직 없음).
