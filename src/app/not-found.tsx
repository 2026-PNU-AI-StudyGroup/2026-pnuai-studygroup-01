import Link from "next/link";

import { Brand } from "@/shared/ui/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-6 py-12">
      <section className="w-full max-w-xl border-y border-[var(--line)] py-12 text-center">
        <div className="flex justify-center"><Brand /></div>
        <p className="eyebrow mt-10">404</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="muted mx-auto mt-4 max-w-md leading-7">주소가 변경되었거나, 이 페이지를 볼 권한이 없을 수 있습니다.</p>
        <Link href="/dashboard" className="button-primary mt-8">대시보드로 이동</Link>
      </section>
    </main>
  );
}
