import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { auth } from "@/modules/identity/infrastructure/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/update-user")) {
    return NextResponse.json({ message: "계정 이름과 사진은 Google Workspace에서 관리됩니다." }, { status: 404 });
  }
  return handler.POST(request);
}
