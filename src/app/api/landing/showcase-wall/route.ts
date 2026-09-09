import { NextResponse } from "next/server";

import { landingShowcaseWall } from "@/modules/project-program/infrastructure/landing-showcase-wall";
import { prisma } from "@/shared/infrastructure/database/prisma";

/** 표지가 하나도 없거나 스토리지를 못 읽을 때 넘어갈 예비 그림. 손으로 붙여 둔 것이다. */
const FALLBACK_PATH = "/landing/showcase-wall.webp";

/**
 * 랜딩 배경 벽.
 *
 * 로그인 전 화면이 쓰므로 인증을 걸지 않는다. 내보내는 것은 확정된 해커톤 팀의 표지를
 * 한 장으로 이어붙인 그림뿐이고, 그 표지들은 예전에도 손으로 골라 이 자리에 깔려 있었다.
 * 파일 하나하나를 공개하지 않으므로 `/api/files` 의 문은 그대로다.
 */
export async function GET(request: Request) {
  const image = await landingShowcaseWall(prisma);
  if (!image) return NextResponse.redirect(new URL(FALLBACK_PATH, request.url));
  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "image/webp",
      "Content-Length": String(image.byteLength),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
