/**
 * 초대 링크가 가리킨 프로그램을 동의 화면 뒤까지 들고 가는 쿠키.
 *
 * 링크로 들어온 위원은 곧장 그 프로그램 심사 화면으로 가야 한다. 그런데 첫 방문에는
 * 처리방침 동의가 먼저 끼어들고, 그 리디렉트에 주소의 programId 가 함께 사라진다.
 * 주소로 실어 나르면 위조된 programId 를 그대로 믿게 되므로, 서버만 쓸 수 있는 쿠키에
 * 담아 두고 동의가 끝난 뒤 초대 기록으로 다시 확인한다.
 *
 * 동의 한 번을 넘기기 위한 값이라 짧게 산다. 남겨 두면 다음 방문에 지난 초대가 되살아난다.
 */
export const ADVISOR_INVITE_PROGRAM_COOKIE = "pms-advisor-invite-program";

export const ADVISOR_INVITE_PROGRAM_COOKIE_MAX_AGE_SECONDS = 600;
