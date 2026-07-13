import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-16">
      <section className="w-full space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-blue-700">PNUAI</p>
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="leading-7 text-zinc-600">
            인증된 <strong>@pusan.ac.kr</strong> Google Workspace 계정만
            이용할 수 있습니다.
          </p>
        </div>
        <GoogleSignInButton />
      </section>
    </main>
  );
}
