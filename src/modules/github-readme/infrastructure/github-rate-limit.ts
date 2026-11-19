/**
 * GitHub 호출에 사용자별 속도 제한을 둔다.
 *
 * 운영에는 GITHUB_TOKEN 이 없어 서버 IP 하나가 시간당 60회를 모두가 나눠 쓴다. 한 사람이
 * 버튼을 연타하면 다른 팀의 가져오기가 모두 막힌다.
 *
 * ponytail: 인스턴스 메모리에 담는다. 운영이 컨테이너 한 대라 충분하다. 서버를 여러 대로
 * 늘리면 대수만큼 한도가 늘어나므로 그때 공용 저장소로 옮긴다.
 */

const WINDOW_MS = 10 * 60_000;
const MAX_PER_USER = 10;

const hits = new Map<string, number[]>();

/** 한 번 쓸 몫이 남았으면 쓰고 true, 다 썼으면 false. */
export function takeGithubQuota(userId: string, now = Date.now()): boolean {
  const mine = (hits.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (mine.length >= MAX_PER_USER) {
    hits.set(userId, mine);
    return false;
  }
  mine.push(now);
  hits.set(userId, mine);
  // 창을 벗어난 항목만 남은 키는 지워 메모리가 사용자 수만큼 늘지 않게 한다.
  if (hits.size > 1_000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}
