# fix_plan.md

## 미해결
- [ ] (검토 필요, 낮음) "모집 중"/"마감 임박" 필터에 정원이 찬 프로젝트가 섞여 나옴 — `src/modules/topic/infrastructure/prisma-topic-query-repository.ts`의 `phaseWhere()` — 카드에 "정원 마감" 뱃지가 별도로 붙고 지원 버튼도 정상적으로 막혀 있어 실사용 문제는 아니라고 판단해 보류함. 다시 다룰 경우 raw SQL로 정원 초과 topic id 목록을 뽑아 `AND` 조건에 추가하는 방식(기존 skill 검색 패턴과 동일) 사용.
## 해결됨
- [x] "미팅·검토 요청" 기능이 500 에러로 완전히 동작하지 않음 — 로컬 DB에 `project_guidance_requests` 마이그레이션이 적용되지 않고 깨진 마이그레이션 기록이 남아 있었음 — 코드 변경 없이 로컬 DB 마이그레이션 재적용으로 해결 (커밋 없음, 환경 문제) — 2026-08-05
- [x] 승인된 보고서가 "다음 마감"으로 잘못 표시됨 — `src/app/teams/[teamId]/reports/page.tsx` — 커밋 7b77d63 — 2026-08-05
- [x] 지도 요청 폼 테스트의 참고 링크 초기화 검증 순서 오류 — `src/app/teams/[teamId]/_components/project-guidance-request-forms.test.tsx` — 커밋 f5a8a4c — 2026-08-05
- [x] `npm run db:seed-demo`가 재실행 시 실패함(유니크 제약 위반 + 트랜잭션 타임아웃) — `scripts/seed-demo-data.ts` — 커밋 2efdd41 — 2026-08-05
- [x] 팀 대화(채팅)에 메시지를 보내도 다른 팀원에게 알림이 전혀 가지 않음 — `src/modules/team/infrastructure/prisma-team-discussion-repository.ts` 외 — 커밋 c9f3753 — 2026-08-05
- [x] 한국어 시각 표시(`오전`/`오후`)에서 서버·클라이언트 hydration 불일치 — Node ICU가 ko-KR AM/PM을 "AM"/"PM"으로 렌더링하는 게 원인 — `src/shared/i18n/i18n-provider.tsx`의 `UiDate` — 커밋 fdffd97 — 2026-08-05
- [x] 학생 프로젝트 제안을 승인/반려해도 제안한 학생에게 알림이 가지 않음 — `src/modules/topic-approval/infrastructure/prisma-topic-approval-repository.ts` 외 — 커밋 3e26aee — 2026-08-06
- [x] 위 hydration 수정(fdffd97)이 밤 시간대(21시~05시대)를 "오후/오전" 대신 "밤/새벽"으로 바꾸는 회귀를 일으킴 — dayPeriod 옵션이 Node·브라우저 모두에서 더 넓은 시간대 어휘를 쓰게 만든 게 원인 — 시(hour) 숫자를 직접 계산하는 방식으로 재수정 — `src/shared/i18n/i18n-provider.tsx` — 커밋 c437800 — 2026-08-06
