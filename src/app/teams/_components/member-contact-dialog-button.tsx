"use client";

import { useRef } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton } from "@/modules/translation/ui/localized-elements";
import { MemberContacts, type MemberContactInfo } from "@/shared/ui/member-contacts";

export function MemberContactDialogButton({ name, email, contacts }: { name: string; email: string; contacts: MemberContactInfo | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label={`${name} 연락처`}
        className="text-left font-bold text-[var(--ink)] hover:text-[var(--primary)] hover:underline"
        onClick={() => dialogRef.current?.showModal()}
      >
        {name}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="member-contact-title"
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-0 text-[var(--ink)] shadow-[0_28px_90px_rgba(31,35,48,.25)] backdrop:bg-[var(--ink)]/45"
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="member-contact-title" className="text-xl font-bold tracking-[-0.035em]">{name}</h2>
              <p className="mt-1 break-all text-sm text-[var(--muted)]">{email}</p>
            </div>
            <UiButton
              type="button"
              aria-label="닫기"
              className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </UiButton>
          </div>
          <MemberContacts
            phone={contacts?.phone ?? ""}
            kakao={contacts?.kakao ?? ""}
            github={contacts?.github ?? ""}
            instagram={contacts?.instagram ?? ""}
          />
        </div>
      </dialog>
    </>
  );
}
