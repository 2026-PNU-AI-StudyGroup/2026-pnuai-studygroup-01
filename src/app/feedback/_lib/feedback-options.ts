// 피드백 게시판 드롭다운 옵션·라벨. 클라이언트 폼과 서버 카드 양쪽에서 공유한다.

export const TARGET_SCREENS = [
  { value: "STUDENT", label: "학생 화면" },
  { value: "PROFESSOR", label: "교수 화면" },
  { value: "ADMIN", label: "관리자 화면" },
  { value: "COMMON", label: "공통·기타" },
] as const;

export const FEEDBACK_TYPES = [
  { value: "FEATURE", label: "새 기능 추가" },
  { value: "BUG", label: "버그 수정" },
] as const;

export const FEEDBACK_AREAS = [
  "프로젝트 탐색·지원",
  "팀원 모집",
  "팀 워크스페이스",
  "보고서·점수·피드백",
  "공지·알림",
  "관리자 설정",
  "로그인·계정·온보딩",
  "기타",
] as const;

export type TargetScreenValue = (typeof TARGET_SCREENS)[number]["value"];
export type FeedbackTypeValue = (typeof FEEDBACK_TYPES)[number]["value"];
export type FeedbackAreaValue = (typeof FEEDBACK_AREAS)[number];

export const TARGET_SCREEN_LABEL = Object.fromEntries(
  TARGET_SCREENS.map((option) => [option.value, option.label]),
) as Record<TargetScreenValue, string>;

export const FEEDBACK_TYPE_LABEL = Object.fromEntries(
  FEEDBACK_TYPES.map((option) => [option.value, option.label]),
) as Record<FeedbackTypeValue, string>;

export const TARGET_SCREEN_VALUES = TARGET_SCREENS.map((option) => option.value);
export const FEEDBACK_TYPE_VALUES = FEEDBACK_TYPES.map((option) => option.value);

// 입력 길이 제한
export const FEEDBACK_LIMITS = {
  name: 40,
  title: 120,
  body: 8_000,
  comment: 2_000,
} as const;

// 서버 액션 상태. "use server" 파일은 async 함수만 export할 수 있어 여기에 둔다.
export type FeedbackActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const feedbackInitialState: FeedbackActionState = { status: "idle", message: "" };
