import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";

import { AccountIcon, CheckIcon } from "@/shared/ui/workspace-icons";
import { AccountSectionLayout } from "@/app/account/_components/account-section-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("내 계정");
}

const roleLabel = { STUDENT: "학생", PROFESSOR: "교수", ADMIN: "관리자" } as const;

export default async function AccountPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const profile = actor.role === "STUDENT" ? await new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor) : null;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/account">
      <AccountSectionLayout role={actor.role} currentPath="/account">
        <div className={`grid gap-10 ${actor.role === "STUDENT" ? "xl:grid-cols-2 xl:gap-12" : ""}`}>
          <section aria-labelledby="account-summary-heading" className="grid gap-6 border-y border-[var(--line)] py-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
            <div>
              <h2 id="account-summary-heading" className="text-lg font-extrabold tracking-[-0.02em]"><UiText>{"기본 정보"}</UiText></h2>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-5 pb-8">
                <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                  <AccountIcon className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-extrabold tracking-[-0.035em]">{actor.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{roleLabel[actor.role]}</p>
                </div>
              </div>
              <dl className="border-t border-[var(--line)] text-sm">
                <div className="grid gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold text-[var(--muted)]"><UiText>{"이메일"}</UiText></dt>
                  <dd className="break-all font-semibold text-[var(--ink)]">{actor.email}</dd>
                </div>
                <div className="grid gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold text-[var(--muted)]"><UiText>{"인증"}</UiText></dt>
                  <dd className="font-semibold text-[var(--ink)]"><UiText>{"부산대학교 Google Workspace"}</UiText></dd>
                </div>
              </dl>
            </div>
          </section>

          {actor.role === "STUDENT" ? (
            <section aria-labelledby="project-profile-heading" className="grid gap-6 border-y border-[var(--line)] py-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
              <div>
                <h2 id="project-profile-heading" className="text-lg font-extrabold tracking-[-0.02em]"><UiText>{"프로젝트 프로필"}</UiText></h2>
              </div>
              <div>
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className={`inline-flex items-center gap-1.5 text-sm font-bold ${profile ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                      {profile ? <CheckIcon className="size-4" /> : null}
                      <UiText>{profile ? "작성 완료" : "작성 필요"}</UiText>
                    </p>
                    {profile ? (
                      <>
                        <p className="mt-4 text-base font-extrabold leading-6">{profile.desiredRole}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{profile.availability}</UiText></p>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">{profile.bio}</p>
                        <UiUl aria-label="관심 분야와 보유 기술" className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                          {[...profile.interests, ...profile.skills].slice(0, 6).map((item) => (
                            <li key={item} className="text-xs font-semibold text-[var(--muted)]">#{item}</li>
                          ))}
                        </UiUl>
                      </>
                    ) : (
                      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                        <UiText>{"관심 분야와 기술, 참여 가능한 시간을 입력하면 지원할 때 바로 활용할 수 있습니다."}</UiText></p>
                    )}
                  </div>
                  <Link className={profile ? "button-secondary" : "button-primary"} href="/account/profile">
                    <UiText>{profile ? "프로필 수정" : "프로필 작성"}</UiText>
                  </Link>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </AccountSectionLayout>
    </AppShell>
  );
}
