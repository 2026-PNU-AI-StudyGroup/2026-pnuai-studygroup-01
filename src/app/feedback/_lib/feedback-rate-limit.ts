/**
 * 로그인 없이 열려 있는 피드백 등록에 속도 제한을 둔다.
 *
 * 서버 액션은 공개 HTTP 엔드포인트다. 검사가 없던 동안 비로그인 외부인이 스크립트로
 * 8,000자 본문을 무제한 등록할 수 있었다. 운영 도메인 첫 화면이 스팸으로 도배되고
 * 표가 계속 커진다.
 *
 * 창구를 살리기로 정했으므로 로그인을 요구하지 않고 속도만 막는다. 같은 IP 로 자주 오는
 * 것과 전체가 한꺼번에 몰리는 것 두 가지를 본다. 전체 제한은 IP 를 바꿔 가며 들어오는
 * 경우를 막는 뒤받침이다.
 *
 * ponytail: 인스턴스 메모리에 담는다. 운영이 컨테이너 한 대라 충분하고, IP 를 어디에도
 * 저장하지 않아 남는 개인정보가 없다. 서버를 여러 대로 늘리거나 재시작을 노린 우회가
 * 실제로 보이면 공용 저장소(Redis 또는 해시한 IP 컬럼)로 옮긴다.
 */

const WINDOW_MS = 60_000;
const MAX_PER_CLIENT = 3;
const MAX_TOTAL = 20;

const clientHits = new Map<string, number[]>();
let totalHits: number[] = [];

function recent(times: number[], now: number): number[] {
  return times.filter((time) => now - time < WINDOW_MS);
}

/** 프록시가 붙여 주는 헤더에서 요청자를 고른다. 없으면 하나로 묶어 전체 제한만 걸린다. */
export function feedbackClientKey(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export type FeedbackRateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function checkFeedbackRateLimit(clientKey: string, now = Date.now()): FeedbackRateDecision {
  totalHits = recent(totalHits, now);
  const mine = recent(clientHits.get(clientKey) ?? [], now);

  const blocking = mine.length >= MAX_PER_CLIENT
    ? mine
    : totalHits.length >= MAX_TOTAL
      ? totalHits
      : null;
  if (blocking) {
    // 창이 비는 시각까지 남은 초. 0 으로 안내하지 않도록 최소 1초를 준다.
    const oldest = Math.min(...blocking);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) };
  }

  mine.push(now);
  totalHits.push(now);
  clientHits.set(clientKey, mine);
  // 창을 벗어난 항목만 남은 키는 지운다. 메모리가 IP 수만큼 늘어나지 않게 한다.
  if (clientHits.size > 1_000) {
    for (const [key, times] of clientHits) {
      if (recent(times, now).length === 0) clientHits.delete(key);
    }
  }
  return { allowed: true };
}

/** 시험에서 창을 비운다. */
export function resetFeedbackRateLimit(): void {
  clientHits.clear();
  totalHits = [];
}
