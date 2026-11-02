import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfileImageRepository } from "@/modules/identity/infrastructure/prisma-profile-image-repository";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

import { AccountSectionLayout, SettingsSection } from "@/app/account/_components/account-section-layout";
import { ProfilePhotoEditor } from "@/app/account/_components/profile-photo-editor";
import { StudentAccountForm } from "@/app/account/_components/student-account-form";
import { StudentProfileForm } from "@/app/account/_components/student-profile-form";
import { AccountWithdrawalForm } from "@/app/account/_components/account-withdrawal-form";
import { EmailPreferenceForm } from "@/app/account/_components/email-preference-form";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("내 계정");
}

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자", ADVISOR: "자문위원" } as const;

export default async function AccountPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const student = actor.role === "STUDENT";
  const profile = student ? await new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor) : null;
  const account = student
    ? await prisma.user.findUnique({ where: { id: actor.id }, select: { department: true, studentNumber: true, grade: true, contactEmail: true } })
    : null;
  const [profileImage, emailPreference] = await Promise.all([
    new PrismaProfileImageRepository(prisma).findForOwner(actor.id),
    prisma.emailPreference.findUnique({
      where: { userId: actor.id },
      select: { reportActivityEnabled: true, discussionEnabled: true, programActivityEnabled: true, deadlineEnabled: true },
    }),
  ]);
  // 제목 밑 한 줄: 학생은 비어 있는 연락처 칸, 모두에게는 받고 있는 선택 이메일 수.
  const emptyContacts = student ? [profile?.phone, profile?.kakao, profile?.github, profile?.instagram].filter((value) => !value).length : 0;
  const emailOn = emailPreference ? Object.values(emailPreference).filter(Boolean).length : 0;
  const finding = (
    <>
      {emptyContacts ? <><b className="font-semibold"><UiText>{`연락처 4칸 중 ${emptyContacts}칸이 비어 있습니다.`}</UiText></b>{" "}</> : null}
      <UiText>{`선택 이메일 알림 4가지 중 ${emailOn}가지를 받고 있습니다.`}</UiText>
    </>
  );
  const row = "grid gap-1 py-2.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4 [&+div]:border-t [&+div]:border-[var(--line)]";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/account" crumbs={[{ label: "내 계정" }]}>
      <AccountSectionLayout finding={finding}>
        <SettingsSection id="account-summary-heading" title="기본 정보" description={actor.role === "ADVISOR" ? undefined : "부산대학교 Google 계정으로 확인한 이름과 이메일입니다."}>
          <div className="px-5 py-4">
            <ProfilePhotoEditor userId={actor.id} initialUpdatedAt={profileImage?.updatedAt ?? null} />
          </div>
          <dl className="border-t border-[var(--line)] px-5 py-1 text-sm">
            <div className={row}>
              <dt className="text-[var(--muted)]"><UiText>{"이름"}</UiText></dt>
              <dd className="min-w-0 break-words font-medium text-[var(--ink)]">{actor.name}</dd>
            </div>
            <div className={row}>
              <dt className="text-[var(--muted)]"><UiText>{"역할"}</UiText></dt>
              <dd className="text-[var(--ink)]"><UiText>{roleLabel[actor.role]}</UiText></dd>
            </div>
            <div className={row}>
              <dt className="text-[var(--muted)]"><UiText>{"이메일"}</UiText></dt>
              <dd className="break-all text-[var(--ink)]">{actor.email}</dd>
            </div>
            <div className={row}>
              <dt className="text-[var(--muted)]"><UiText>{"인증"}</UiText></dt>
              <dd className="text-[var(--ink)]"><UiText>{"부산대학교 Google Workspace"}</UiText></dd>
            </div>
          </dl>
        </SettingsSection>

        {student ? (
          <SettingsSection id="academic-info-heading" title="학사 정보" description="학과·학번·학년과 자주 쓰는 이메일입니다. 팀 구성원 정보에 표시됩니다.">
            <StudentAccountForm info={{ department: account?.department ?? "", studentNumber: account?.studentNumber ?? "", grade: account?.grade ?? null, contactEmail: account?.contactEmail ?? "" }} />
          </SettingsSection>
        ) : null}

        {student ? (
          <SettingsSection id="project-profile-heading" title="연락처" description="운영진과 같은 팀 팀원에게만 공개되며, 사이트 안에서 서로 연락할 때 사용됩니다.">
            <StudentProfileForm profile={profile} />
          </SettingsSection>
        ) : null}

        <SettingsSection id="email-preference-heading" title="이메일 알림" description="중요 업무 이메일은 항상 학교 이메일로 발송됩니다. 아래 항목만 선택할 수 있습니다.">
          <EmailPreferenceForm preference={emailPreference} />
        </SettingsSection>

        {/* 자문위원은 초대 토큰으로만 들어오고, 스스로 탈퇴하면 관리자도 되살릴 수 없다.
            참여를 끝내는 일은 관리자의 초대 회수로만 처리한다. 되돌릴 수 없는 일이라 맨 끝에 둔다. */}
        {actor.role === "ADVISOR" ? null : (
          <SettingsSection id="withdraw-account-heading" title="계정 탈퇴">
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <p className="text-sm leading-6 text-[var(--muted)]"><UiText>{"탈퇴하면 로그인 권한은 즉시 회수되며 프로젝트 이력과 작성물은 보존됩니다."}</UiText></p>
              <AccountWithdrawalForm />
            </div>
          </SettingsSection>
        )}
      </AccountSectionLayout>
    </AppShell>
  );
}
