"use client";

import { useActionState, useState, useTransition } from "react";

import {
  decideReportAction,
  registerArtifactAction,
  type ReportActionState,
  submitReportVersionAction,
} from "@/app/teams/[teamId]/report-actions";
import type { ApprovalDecision } from "@/modules/report/domain/report-policy";

const initialState: ReportActionState = { status: "idle", message: "" };
const uploadFailureMessage = "파일을 업로드하지 못했습니다. 파일 형식과 용량을 확인한 뒤 다시 시도해 주세요.";

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

export function ReportSubmissionForm({ teamId }: { teamId: string }) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 border-y border-[var(--line)] bg-[var(--surface)] py-5 md:grid-cols-2"
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
      <label className="grid gap-2 text-sm font-semibold">보고서 종류<select name="type" className="field" defaultValue="START">
        <option value="START">착수 보고서</option>
        <option value="MIDTERM">중간 보고서</option>
        <option value="FINAL">결과 보고서</option>
      </select></label>
      <label className="grid gap-2 text-sm font-semibold">보고서 파일<input name="file" type="file" required accept=".pdf,.doc,.docx" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">버전 설명 <span className="muted font-normal">선택 입력</span><textarea name="description" maxLength={2000} rows={2} placeholder="이번 버전에서 변경한 내용을 입력하세요." className="field" /></label>
      <button disabled={pending} className="button-primary justify-self-start">{pending ? "검증 및 제출 중" : "새 버전 제출"}</button>
      {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}
    </form>
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

export function ArtifactExternalForm({ teamId }: { teamId: string }) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  return (
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      data.set("teamId", teamId);
      startTransition(async () => {
        const result = await registerArtifactAction(data);
        setState(result);
        if (result.status === "success") form.reset();
      });
    }}>
      <label className="grid gap-2 text-sm font-semibold">결과물 종류<select name="type" className="field"><option value="SOURCE_CODE">소스 코드</option><option value="PRESENTATION_VIDEO">발표 영상</option><option value="POSTER">포스터</option><option value="OTHER">기타</option></select></label>
      <label className="grid gap-2 text-sm font-semibold">결과물 제목<input name="title" required maxLength={200} placeholder="예: 최종 발표 자료" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold">외부 링크<input name="externalUrl" required type="url" placeholder="https://github.com/example/project" className="field" /></label>
      <button disabled={pending} className="button-primary justify-self-start">외부 링크 등록</button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-2 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}

export function ArtifactFileForm({ teamId }: { teamId: string }) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const file = data.get("file");
      if (!(file instanceof File) || file.size === 0) return;
      startTransition(async () => {
        try {
          const uploadId = await uploadFile(teamId, "ARTIFACT", file);
          data.delete("file");
          data.set("teamId", teamId);
          data.set("uploadId", uploadId);
          const result = await registerArtifactAction(data);
          setState(result);
          if (result.status === "success") form.reset();
        } catch (error) {
          setState({ status: "error", message: error instanceof Error ? error.message : uploadFailureMessage });
        }
      });
    }}>
      <label className="grid gap-2 text-sm font-semibold">결과물 종류<select name="type" className="field"><option value="PRESENTATION_VIDEO">발표 영상</option><option value="SOURCE_CODE">소스 코드</option><option value="POSTER">포스터</option><option value="OTHER">기타</option></select></label>
      <label className="grid gap-2 text-sm font-semibold">결과물 제목<input name="title" required maxLength={200} placeholder="예: 프로젝트 포스터" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold">결과물 파일<input name="file" type="file" required accept=".pdf,.doc,.docx,.zip,.mp4,.webm,.png,.jpg,.jpeg" className="field" /></label>
      <button disabled={pending} className="button-primary justify-self-start">{pending ? "검증 및 등록 중" : "파일 결과물 등록"}</button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-2 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}

export function decisionLabel(decision: ApprovalDecision) {
  return decision === "APPROVED" ? "승인" : "수정 요청";
}
