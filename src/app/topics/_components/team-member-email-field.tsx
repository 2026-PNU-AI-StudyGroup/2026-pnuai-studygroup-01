"use client";

import type { ClipboardEvent, KeyboardEvent } from "react";
import { useId, useState } from "react";

const PNU_EMAIL_PATTERN = /^[^@\s]+@pusan\.ac\.kr$/i;

export function TeamMemberEmailField({ capacity }: { capacity: number }) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const maxInvitees = Math.max(0, capacity - 1);

  function addEmails(values: string[]) {
    const candidates = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (candidates.length === 0) return false;
    const invalid = candidates.find((email) => !PNU_EMAIL_PATTERN.test(email));
    if (invalid) {
      setError("부산대학교 이메일(@pusan.ac.kr)만 추가할 수 있습니다.");
      return false;
    }
    const uniqueCandidates = candidates.filter((email, index) => candidates.indexOf(email) === index);
    if (uniqueCandidates.some((email) => emails.includes(email))) {
      setError("이미 추가한 이메일입니다.");
      return false;
    }
    if (emails.length + uniqueCandidates.length > maxInvitees) {
      setError(`팀원은 최대 ${maxInvitees}명까지 추가할 수 있습니다.`);
      return false;
    }
    setEmails((current) => [...current, ...uniqueCandidates]);
    setDraft("");
    setError("");
    return true;
  }

  function commitDraft() {
    return addEmails(draft.split(/[\s,;]+/));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (["Enter", ",", ";"].includes(event.key)) {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft.length === 0 && emails.length > 0) {
      setEmails((current) => current.slice(0, -1));
      setError("");
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!/[\s,;]+/.test(pasted.trim())) return;
    event.preventDefault();
    addEmails(pasted.split(/[\s,;]+/));
  }

  function removeEmail(email: string) {
    setEmails((current) => current.filter((item) => item !== email));
    setError("");
  }

  return (
    <div className="grid gap-2 sm:col-span-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-sm font-semibold">함께 지원할 팀원</label>
        <span className="text-xs font-semibold text-[var(--muted)]">{emails.length} / {maxInvitees}명</span>
      </div>
      <div className="email-chip-field" onClick={(event) => event.currentTarget.querySelector("input")?.focus()}>
        {emails.map((email) => (
          <span key={email} className="email-chip"><span>{email}</span><button type="button" onClick={() => removeEmail(email)} aria-label={`${email} 삭제`} className="email-chip-remove">×</button></span>
        ))}
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={draft}
          required={emails.length === 0}
          disabled={emails.length >= maxInvitees}
          onChange={(event) => { setDraft(event.target.value); if (error) setError(""); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { if (draft.trim()) commitDraft(); }}
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
          aria-invalid={Boolean(error)}
          placeholder={emails.length === 0 ? "학번@pusan.ac.kr 입력 후 Enter" : "팀원 추가"}
          className="email-chip-input"
        />
      </div>
      <input type="hidden" name="inviteeEmails" value={[...emails, draft.trim()].filter(Boolean).join(",")} />
      {error ? <p id={errorId} role="alert" className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <p id={helpId} className="muted text-xs">Enter 또는 쉼표로 추가할 수 있습니다. 본인을 제외한 부산대학교 이메일을 입력하세요.</p>
    </div>
  );
}
