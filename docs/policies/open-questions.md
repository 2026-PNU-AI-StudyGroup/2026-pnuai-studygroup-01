# 확인 필요 정책

이 문서는 결정이 더 필요하거나 확정된 방향의 세부 범위가 남은 항목만 기록한다. 정책이 확정된 항목은 구현 여부와 관계없이 영역별 유효 정책 문서로 옮긴다.

## 비활성·잔존 모델

- `ProgressUpdate`는 스키마에 있으나 현재 작성·조회 코드가 없다.
- 실행 팀용 `RecruitmentPost`·`RecruitmentApplication`은 종료·정리 코드만 있고 현재 모집 글 생성 진입점은 학생 팀용 모델을 사용한다.
- `TopicApplication`의 `message`, `skills`, `desiredRole`, `availability`는 현재 문항형 지원서에서도 필수 컬럼이라 고정 문구를 저장한다.
- 제거할 레거시인지 향후 복구할 기능인지 결정하기 전에는 유효 정책으로 문서화하지 않는다.
