import { NoticeStack, type NoticeItem } from "@/shared/ui/notice-stack";

// 지난 소식을 계속 띄우지 않게 각자 끝나는 시각을 들고 있는다. 지우는 것을 잊어도 저절로 빠진다.
const DOWNTIME_ENDS_AT = new Date("2026-08-26T10:00:00+09:00");
const EVENT_ENDS_AT = new Date("2026-08-28T18:00:00+09:00");
const VOTE_ENDS_AT = new Date("2026-08-28T16:00:00+09:00");

// 앞에 놓일수록 뒤에 적는다. 마지막이 맨 앞장이고 그것만 통째로 읽힌다.
// 급한 소식을 앞에 둔다. 읽고 닫으면 다음 장이 드러난다.
const ITEMS: NoticeItem[] = [
  {
    id: "hackathon",
    storageKey: "aipms:notice:hackathon-7th",
    endsAt: EVENT_ENDS_AT,
    badge: "제7회 PNU 창의융합AI해커톤",
    title: "최종발표회",
    rows: [
      { label: "일시", value: "2026. 8. 28.(금) 09:00 ~ 18:00" },
      { label: "장소", value: "농심호텔 1층 다이아몬드 B홀" },
      { label: "주제", value: "지정 주제 또는 자유 주제, 웹 또는 모바일 앱" },
    ],
    cta: { href: "#sign-in", label: "로그인하고 결과물 보기" },
  },
  {
    id: "vote",
    storageKey: "aipms:notice:vote-7th",
    endsAt: VOTE_ENDS_AT,
    badge: "온라인 투표",
    title: "마음에 드는 작품에 투표하세요",
    lead: "부산대학교 계정으로 로그인하면 출품작을 둘러보고 투표할 수 있습니다.",
    rows: [{ label: "투표 기간", value: "8. 27.(목) 13:00 ~ 8. 28.(금) 16:00" }],
    cta: { href: "#sign-in", label: "로그인하고 투표하기" },
  },
  {
    id: "downtime",
    storageKey: "aipms:notice:downtime-260825",
    endsAt: DOWNTIME_ENDS_AT,
    tone: "warning",
    badge: "중요",
    title: "서비스 일시 중단 안내",
    lead: "건물 내 전기 공사에 따른 정전으로 아래 시간 동안 서비스 접속이 중단됩니다. 이용에 불편을 드려 죄송하며, 양해 부탁드립니다.",
    rows: [
      { label: "중단 일시", value: "2026년 8월 25일 17:00 ~ 8월 26일 10:00" },
      { label: "중단 사유", value: "일시 정전" },
    ],
  },
];

/** 로그인 전 첫 화면 오른쪽 아래에 쌓이는 안내 창. */
export function LandingNotices() {
  return <NoticeStack items={ITEMS} placement="bottom-right" />;
}
