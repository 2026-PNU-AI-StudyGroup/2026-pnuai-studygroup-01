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
  if (!presign.ok) throw new Error((await presign.json()).message ?? "업로드 URL 발급 실패");
  const { uploadId, uploadUrl } = await presign.json() as { uploadId: string; uploadUrl: string };
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type, "x-amz-checksum-sha256": checksum },
    body: file,
  });
  if (!uploaded.ok) throw new Error("파일 업로드에 실패했습니다.");
  const completed = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId }),
  });
  if (!completed.ok) throw new Error((await completed.json()).message ?? "업로드 검증 실패");
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
            setState({ status: "error", message: error instanceof Error ? error.message : "업로드 실패" });
          }
        });
      }}
    >
      <select name="type" aria-label="보고서 종류" className="field" defaultValue="START">
        <option value="START">착수 보고서</option>
        <option value="MIDTERM">중간 보고서</option>
        <option value="FINAL">결과 보고서</option>
      </select>
      <input name="file" aria-label="보고서 파일" type="file" required accept=".pdf,.doc,.docx" className="field" />
      <textarea name="description" aria-label="버전 설명" maxLength={2000} rows={2} placeholder="이번 버전의 변경 사항 (선택)" className="field md:col-span-2" />
      <button disabled={pending} className="button-primary justify-self-start">{pending ? "검증 및 제출 중" : "새 버전 제출"}</button>
      {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-red-700" : "text-[var(--teal)]"}>{state.message}</p> : null}
    </form>
  );
}

export function ReportDecisionForm({ teamId, reportVersionId }: { teamId: string; reportVersionId: string }) {
  const [state, action, pending] = useActionState(decideReportAction, initialState);
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="reportVersionId" value={reportVersionId} />
      <select name="decision" aria-label="검토 결정" className="field" defaultValue="APPROVED">
        <option value="APPROVED">승인</option>
        <option value="REVISION_REQUESTED">수정 요청</option>
      </select>
      <input name="comment" aria-label="검토 의견" maxLength={2000} placeholder="수정 요청 시 의견 필수" className="field" />
      <button disabled={pending} className="button-quiet">결정 저장</button>
      {state.message ? <p className={`sm:col-span-3 text-sm ${state.status === "error" ? "text-red-700" : "text-[var(--teal)]"}`}>{state.message}</p> : null}
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
      <select name="type" aria-label="결과물 종류" className="field"><option value="SOURCE_CODE">소스 코드</option><option value="PRESENTATION_VIDEO">발표 영상</option><option value="POSTER">포스터</option><option value="OTHER">기타</option></select>
      <input name="title" required maxLength={200} placeholder="결과물 제목" className="field" />
      <input name="externalUrl" required type="url" placeholder="https://..." className="field" />
      <button disabled={pending} className="button-primary justify-self-start">외부 링크 등록</button>
      {state.message ? <p className={`sm:col-span-2 text-sm ${state.status === "error" ? "text-red-700" : "text-[var(--teal)]"}`}>{state.message}</p> : null}
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
          setState({ status: "error", message: error instanceof Error ? error.message : "업로드 실패" });
        }
      });
    }}>
      <select name="type" aria-label="파일 결과물 종류" className="field"><option value="PRESENTATION_VIDEO">발표 영상</option><option value="SOURCE_CODE">소스 코드</option><option value="POSTER">포스터</option><option value="OTHER">기타</option></select>
      <input name="title" required maxLength={200} placeholder="결과물 제목" className="field" />
      <input name="file" aria-label="결과물 파일" type="file" required accept=".pdf,.doc,.docx,.zip,.mp4,.webm,.png,.jpg,.jpeg" className="field" />
      <button disabled={pending} className="button-primary justify-self-start">{pending ? "검증 및 등록 중" : "파일 결과물 등록"}</button>
      {state.message ? <p className={`sm:col-span-2 text-sm ${state.status === "error" ? "text-red-700" : "text-[var(--teal)]"}`}>{state.message}</p> : null}
    </form>
  );
}

export function decisionLabel(decision: ApprovalDecision) {
  return decision === "APPROVED" ? "승인" : "수정 요청";
}
