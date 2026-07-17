"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";

import {
  decideReportAction,
  registerArtifactAction,
  removeReportRequirementAction,
  setReportRequirementAction,
  type ReportActionState,
  submitReportVersionAction,
} from "@/app/teams/[teamId]/report-actions";
import type { ApprovalDecision, ReportType } from "@/modules/report/domain/report-policy";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: ReportActionState = { status: "idle", message: "" };
const uploadFailureMessage = "파일을 업로드하지 못했습니다. 파일 형식과 용량을 확인한 뒤 다시 시도해 주세요.";
const TOAST_DURATION_MS = 3_000;
const reportTypeLabel: Record<ReportType, string> = {
  START: "착수 보고서",
  MIDTERM: "중간 보고서",
  FINAL: "결과 보고서",
};
const koreanDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

function koreanDateTimeInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = new Map(parts.map((part) => [part.type, part.value]));
  return `${value.get("year")}-${value.get("month")}-${value.get("day")}T${value.get("hour")}:${value.get("minute")}`;
}

async function uploadErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return uploadFailureMessage;
}

async function uploadFile(teamId: string, purpose: "REPORT" | "ARTIFACT", file: File) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const checksum = btoa(String.fromCharCode(...digest));
  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      teamId,
      purpose,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      sha256,
    }),
  });
  if (!presign.ok) throw new Error(await uploadErrorMessage(presign));
  const { uploadId, uploadUrl } = await presign.json() as { uploadId: string; uploadUrl: string };
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type, "x-amz-checksum-sha256": checksum },
    body: file,
  });
  if (!uploaded.ok) throw new Error(uploadFailureMessage);
  const completed = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId }),
  });
  if (!completed.ok) throw new Error(await uploadErrorMessage(completed));
  return uploadId;
}

export function ReportRequirementForm({ teamId, executionStartsAt, submissionEndsAt }: {
  teamId: string;
  executionStartsAt: Date;
  submissionEndsAt: Date;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(setReportRequirementAction, initialState);
  const [dismissedSuccess, setDismissedSuccess] = useState<ReportActionState | null>(null);
  const toastMessage = state.status === "success" && state !== dismissedSuccess ? state.message : "";
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      setDismissedSuccess(state);
      router.refresh();
    }, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state]);
  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="button-primary">보고서 요구사항 설정</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">보고서 운영</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">제출 요구사항 설정</h3><p className="muted mt-2 text-sm">프로젝트에서 제출할 보고서와 마감 시각을 지정합니다.</p></div><button type="button" onClick={() => { if (!pending) dialogRef.current?.close(); }} disabled={pending} aria-label="보고서 설정 닫기" className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <label className="grid gap-2 text-sm font-semibold">제출 보고서<select name="type" className="field" defaultValue="START"><option value="START">착수 보고서</option><option value="MIDTERM">중간 보고서</option><option value="FINAL">결과 보고서</option></select></label>
          <label className="grid gap-2 text-sm font-semibold">제출 기한<input name="dueAt" type="datetime-local" required min={koreanDateTimeInput(executionStartsAt)} max={koreanDateTimeInput(submissionEndsAt)} className="field" /></label>
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]">{state.message}</p> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => dialogRef.current?.close()} disabled={pending} className="button-quiet">취소</button><button disabled={pending} className="button-primary">{pending ? "저장 중" : "요구사항 저장"}</button></div>
        </form>
      </dialog>
      {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{toastMessage}</div> : null}
    </>
  );
}

export function RemoveReportRequirementForm({ teamId, type, disabled }: { teamId: string; type: ReportType; disabled: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(removeReportRequirementAction, initialState);
  useEffect(() => {
    if (state.status !== "success") return;
    const timer = window.setTimeout(() => router.refresh(), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state.status]);
  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="type" value={type} />
      <ConfirmSubmitButton disabled={disabled || pending} className="button-quiet text-[var(--danger)]" confirmMessage={`${reportTypeLabel[type]} 요구사항을 해제하시겠습니까?`}>
        {disabled ? "제출 이력 있음" : pending ? "해제 중" : "요구 해제"}
      </ConfirmSubmitButton>
      {state.status === "error" ? <p role="alert" className="mt-2 max-w-sm text-xs font-semibold text-[var(--danger)]">{state.message}</p> : null}
      {state.status === "success" ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{state.message}</div> : null}
    </form>
  );
}

export function ReportSubmissionForm({ teamId, requirements }: {
  teamId: string;
  requirements: Array<{ type: ReportType; dueAt: Date }>;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [dismissedSuccess, setDismissedSuccess] = useState<ReportActionState | null>(null);
  const toastMessage = state.status === "success" && state !== dismissedSuccess ? state.message : "";
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      setDismissedSuccess(state);
      router.refresh();
    }, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state]);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="button-primary">보고서 제출</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
      <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">보고서 제출</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">새 버전 등록</h3><p className="muted mt-2 text-sm">설정된 기한 안에 PDF 또는 Word 파일을 제출합니다.</p></div><button type="button" onClick={() => { if (!pending) dialogRef.current?.close(); }} disabled={pending} aria-label="보고서 제출 닫기" className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
      <form
      className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const file = data.get("file");
        if (!(file instanceof File) || file.size === 0) return;
        startTransition(async () => {
          try {
            const uploadId = await uploadFile(teamId, "REPORT", file);
            data.delete("file");
            data.set("teamId", teamId);
            data.set("uploadId", uploadId);
            const result = await submitReportVersionAction(data);
            setState(result);
            if (result.status === "success") form.reset();
          } catch (error) {
            setState({ status: "error", message: error instanceof Error ? error.message : uploadFailureMessage });
          }
        });
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">보고서 종류<select name="type" className="field" defaultValue={requirements[0]?.type}>
        {requirements.map((requirement) => <option key={requirement.type} value={requirement.type}>{reportTypeLabel[requirement.type]} · {koreanDateTime.format(requirement.dueAt)}까지</option>)}
      </select></label>
      <label className="grid gap-2 text-sm font-semibold">보고서 파일<input name="file" type="file" required accept=".pdf,.doc,.docx" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">버전 설명 <span className="muted font-normal">선택 입력</span><textarea name="description" maxLength={2000} rows={2} placeholder="이번 버전에서 변경한 내용을 입력하세요." className="field" /></label>
      {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">{state.message}</p> : null}
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => dialogRef.current?.close()} disabled={pending} className="button-quiet">취소</button><button disabled={pending} className="button-primary">{pending ? "검증 및 제출 중" : "새 버전 제출"}</button></div>
    </form>
    </dialog>
    {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{toastMessage}</div> : null}
    </>
  );
}

export function ReportDecisionForm({ teamId, reportVersionId }: { teamId: string; reportVersionId: string }) {
  const [state, action, pending] = useActionState(decideReportAction, initialState);
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="reportVersionId" value={reportVersionId} />
      <label className="grid gap-2 text-sm font-semibold">검토 결정<select name="decision" className="field" defaultValue="APPROVED">
        <option value="APPROVED">승인</option>
        <option value="REVISION_REQUESTED">수정 요청</option>
      </select></label>
      <label className="grid gap-2 text-sm font-semibold">검토 의견<input name="comment" maxLength={2000} placeholder="수정 요청을 선택한 경우 필수" className="field" /></label>
      <button disabled={pending} className="button-quiet">결정 저장</button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-3 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}

export function ArtifactRegistrationForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [method, setMethod] = useState<"LINK" | "FILE">("LINK");
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [dismissedSuccess, setDismissedSuccess] = useState<ReportActionState | null>(null);
  const toastMessage = state.status === "success" && state !== dismissedSuccess ? state.message : "";
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      setDismissedSuccess(state);
      router.refresh();
    }, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state]);
  return (
    <>
      <button type="button" className="button-primary" onClick={() => dialogRef.current?.showModal()}>결과물 등록</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">프로젝트 결과</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">결과물 등록</h3><p className="muted mt-2 text-sm">공개 링크 또는 파일 중 한 방식으로 결과물을 추가합니다.</p></div><button type="button" aria-label="결과물 등록 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
        <div className="flex gap-2 border-b border-[var(--line)] px-5 py-4 sm:px-7" role="group" aria-label="결과물 등록 방식"><button type="button" disabled={pending} aria-pressed={method === "LINK"} onClick={() => { setMethod("LINK"); setState(initialState); }} className={method === "LINK" ? "button-primary" : "button-quiet"}>외부 링크</button><button type="button" disabled={pending} aria-pressed={method === "FILE"} onClick={() => { setMethod("FILE"); setState(initialState); }} className={method === "FILE" ? "button-primary" : "button-quiet"}>파일 업로드</button></div>
        <form className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          startTransition(async () => {
            try {
              data.set("teamId", teamId);
              if (method === "FILE") {
                const file = data.get("file");
                if (!(file instanceof File) || file.size === 0) return;
                const uploadId = await uploadFile(teamId, "ARTIFACT", file);
                data.delete("file");
                data.set("uploadId", uploadId);
              }
              const result = await registerArtifactAction(data);
              setState(result);
              if (result.status === "success") form.reset();
            } catch (error) {
              setState({ status: "error", message: error instanceof Error ? error.message : uploadFailureMessage });
            }
          });
        }}>
          <label className="grid gap-2 text-sm font-semibold">결과물 종류<select name="type" className="field" defaultValue={method === "LINK" ? "SOURCE_CODE" : "PRESENTATION_VIDEO"}><option value="SOURCE_CODE">소스 코드</option><option value="PRESENTATION_VIDEO">발표 영상</option><option value="POSTER">포스터</option><option value="OTHER">기타</option></select></label>
          <label className="grid gap-2 text-sm font-semibold">결과물 제목<input name="title" required maxLength={200} placeholder="예: 최종 발표 자료" className="field" /></label>
          {method === "LINK" ? <label className="grid gap-2 text-sm font-semibold sm:col-span-2">외부 링크<input name="externalUrl" required type="url" placeholder="https://github.com/example/project" className="field" /></label> : <label className="grid gap-2 text-sm font-semibold sm:col-span-2">결과물 파일<input name="file" type="file" required accept=".pdf,.doc,.docx,.zip,.mp4,.webm,.png,.jpg,.jpeg" className="field" /></label>}
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">{state.message}</p> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}>취소</button><button className="button-primary" disabled={pending}>{pending ? "검증 및 등록 중" : "결과물 등록"}</button></div>
        </form>
      </dialog>
      {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{toastMessage}</div> : null}
    </>
  );
}

export function decisionLabel(decision: ApprovalDecision) {
  return decision === "APPROVED" ? "승인" : "수정 요청";
}
