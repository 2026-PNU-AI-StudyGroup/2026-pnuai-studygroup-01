# fix_plan.md

## 미해결
- [ ] (검토 필요, 낮음) "모집 중"/"마감 임박" 필터에 정원이 찬 프로젝트가 섞여 나옴 — `src/modules/topic/infrastructure/prisma-topic-query-repository.ts`의 `phaseWhere()` — 카드에 "정원 마감" 뱃지가 별도로 붙고 지원 버튼도 정상적으로 막혀 있어 실사용 문제는 아니라고 판단해 보류함. 다시 다룰 경우 raw SQL로 정원 초과 topic id 목록을 뽑아 `AND` 조건에 추가하는 방식(기존 skill 검색 패턴과 동일) 사용.

## 해결됨
- [x] "미팅·검토 요청" 기능이 500 에러로 완전히 동작하지 않음 — 로컬 DB에 `project_guidance_requests` 마이그레이션이 적용되지 않고 깨진 마이그레이션 기록이 남아 있었음 — 코드 변경 없이 로컬 DB 마이그레이션 재적용으로 해결 (커밋 없음, 환경 문제) — 2026-08-05
- [x] 승인된 보고서가 "다음 마감"으로 잘못 표시됨 — `src/app/teams/[teamId]/reports/page.tsx` — 커밋 7b77d63 — 2026-08-05
- [x] 지도 요청 폼 테스트의 참고 링크 초기화 검증 순서 오류 — `src/app/teams/[teamId]/_components/project-guidance-request-forms.test.tsx` — 커밋 f5a8a4c — 2026-08-05
