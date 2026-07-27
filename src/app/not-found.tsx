import Link from "next/link";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { Brand } from "@/shared/ui/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--workspace)] px-6 py-12">
      <section className="w-full max-w-xl border-y border-[var(--line)] py-12 text-center">
        <div className="flex justify-center"><Brand /></div>
        <p className="eyebrow mt-10">404</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight"><UiText>{"페이지를 찾을 수 없습니다"}</UiText></h1>
        <p className="muted mx-auto mt-4 max-w-md leading-7"><UiText>{"입력한 주소가 정확한지 확인하거나 프로젝트 탐색으로 돌아가 주세요."}</UiText></p>
        <Link href="/topics" className="button-primary mt-8"><UiText>{"프로젝트 탐색으로 이동"}</UiText></Link>
      </section>
    </main>
  );
}
