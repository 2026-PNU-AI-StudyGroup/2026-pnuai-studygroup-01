import { redirect } from "next/navigation";

import { DevelopmentRoleSignIn } from "@/modules/identity/ui/development-role-sign-in";
import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ mockLogin?: string }>;
}) {
  const actor = await getCurrentActor();
  if (actor) {
    if (actor.role === "STUDENT") {
      const registration = await prisma.user.findUnique({
        where: { id: actor.id },
        select: {
          onboardingRequired: true,
          onboardingCompletedAt: true,
        },
      });
      if (registration?.onboardingRequired && !registration.onboardingCompletedAt) {
        redirect("/onboarding");
      }
    }
    redirect("/topics");
  }

  const params = await searchParams;
  const showDevelopmentLogin = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <div className="min-h-screen lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen min-h-[42rem] flex-col items-center bg-[var(--sidebar)] px-2 py-6 lg:flex">
          <Brand href="/" variant="sidebar" inverse />
        </aside>

        <div className="min-w-0">
          <header className="border-b border-[var(--line)] bg-white px-5 py-5 sm:px-8 lg:hidden">
            <Brand href="/" />
          </header>
          <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center px-5 py-10 sm:px-8 lg:min-h-screen">
            <section aria-labelledby="sign-in-title" className="w-full max-w-[31rem] border-t-4 border-[var(--primary)] bg-white p-6 sm:p-9">
              <h1 id="sign-in-title" className="text-3xl font-bold tracking-[-0.05em]"><UiText>{"로그인"}</UiText></h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                <UiText>{"부산대학교 계정으로 로그인하세요."}</UiText>
              </p>
              <div className="mt-7 border-y border-[var(--line)] py-6">
                <GoogleSignInButton />
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                <strong className="font-semibold text-[var(--ink)]">@pusan.ac.kr</strong> {" "}<UiText>{"계정만 사용할 수 있습니다."}</UiText>
              </p>
              {showDevelopmentLogin ? (
                <DevelopmentRoleSignIn seedRequired={params?.mockLogin === "seed-required"} />
              ) : null}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
