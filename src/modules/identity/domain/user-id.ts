import { z } from "zod";

// 사용자 ID 는 better-auth 가 32자 영숫자 무작위 문자열로 만든다. UUID 가 아니다.
// UUID 로 검사하면 시드 계정만 통과하고 실제 로그인 계정은 모두 걸러진다.
export const userIdSchema = z.string().trim().min(1).max(200);
