# PMS UI 디자인 기준

`pms-ui-concept-ink-cobalt.png`은 imagegen으로 생성하고 검토한 현재 구현 기준 시안이다. 기존 `pms-ui-concept.png`은 초기 탐색 기록으로 보존한다.

## 방향

- 전형적인 관리자 대시보드 대신 콘텐츠 중심의 편집형 화면 구성
- 데스크톱은 슬림한 상단 내비게이션, 모바일은 하단 내비게이션 사용
- 정보마다 카드를 만들지 않고 여백과 얇은 구분선으로 계층 표현
- cool canvas `#F7F8FA`, white surface, ink navy `#172033`, cool gray로 화면 구조 표현
- Cobalt `#2F5BEA`만 상호작용 및 장식 accent로 사용
- success, warning, danger 색은 실제 의미를 가진 상태와 피드백에만 사용
- 시안에 포함된 다색 카테고리 아이콘 타일은 구현하지 않으며, 아이콘과 장식은 Cobalt와 gray로 제한
- 한 화면의 focal point는 제목 또는 하나의 primary action 한 곳으로 제한
- 자체 호스팅 Pretendard Variable과 140ms Snap 상호작용 사용
- 최소 44px 상호작용 영역과 명시적인 키보드 포커스 제공

## 적용 화면

- 랜딩 및 로그인
- 역할별 대시보드
- 학생 주제 탐색 및 지원
- 교수 주제 관리 및 지원 검토
- 관리자 학기 관리
- 팀 워크스페이스
- 공통 빈 상태, 404, 오류 복구 상태
