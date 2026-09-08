"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADVISOR_INVITE_PROGRAM_COOKIE } from "@/modules/advisor/domain/advisor-invite-cookie";
import { hasActiveAdvisorInvitation } from "@/modules/advisor/infrastructure/prisma-advisor-invitation-query";
import { advisorProgramHref } from "@/modules/advisor/infrastructure/prisma-advisor-landing-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function acceptPrivacyConsentAction(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");

  // 체크박스의 required 는 브라우저 쪽 도움일 뿐이다. 동의 여부는 서버에서 다시 본다.
  if (formData.get("privacyConsent") !== "on") redirect("/onboarding");

  // 이미 동의한 사용자의 최초 동의 시각을 덮어쓰지 않는다.
  await prisma.user.updateMany({
    where: { id: actor.id, privacyConsentAt: null },
    data: { privacyConsentAt: new Date() },
  });

  // 초대 링크로 들어온 자문위원은 동의를 마치는 순간 그 프로그램 심사 화면으로 보낸다.
  // 쿠키는 서버만 쓰지만 그것만으로 권한 근거가 되지는 않는다. 쿠키를 심은 뒤 초대가
  // 회수됐을 수도 있어 초대 기록을 다시 확인하고, 확인 여부와 무관하게 쿠키는 지운다.
  const invitedProgramPath = await consumeAdvisorInviteProgram(actor.id, actor.role);
  if (invitedProgramPath) redirect(invitedProgramPath);

  redirect("/onboarding");
}

async function consumeAdvisorInviteProgram(userId: string, role: string): Promise<string | null> {
  const cookieStore = await cookies();
  const programId = cookieStore.get(ADVISOR_INVITE_PROGRAM_COOKIE)?.value;
  if (!programId) return null;
  cookieStore.delete(ADVISOR_INVITE_PROGRAM_COOKIE);
  if (role !== "ADVISOR") return null;
  const invited = await hasActiveAdvisorInvitation(prisma, { userId, programId });
  return invited ? advisorProgramHref(programId) : null;
}
