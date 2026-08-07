"use client";

import { useActionState } from "react";

import {
  createTrackAction,
  deleteTrackAction,
  moveTrackAction,
  trackInitialState,
} from "@/app/admin/programs/[programId]/tracks/_actions/track-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export type TrackRow = { id: string; name: string; topicCount: number };

export function TrackManager({ programId, tracks }: { programId: string; tracks: TrackRow[] }) {
  const [state, action, pending] = useActionState(createTrackAction.bind(null, programId), trackInitialState);

  return (
    <div className="grid gap-5">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{"트랙 이름"}</UiText></span>
          <UiInput className="form-control bg-white" name="name" type="text" maxLength={40} placeholder="예: 창업 트랙" required />
        </label>
        <button className="button-primary" type="submit" disabled={pending}>
          <UiText>{pending ? "추가 중" : "트랙 추가"}</UiText>
        </button>
        {state.message ? (
          <span className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span>
        ) : null}
      </form>

      {tracks.length ? (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {tracks.map((track, index) => (
            <li key={track.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <strong className="text-[var(--ink)]">{track.name}</strong>
                <span className="muted ml-2 text-xs"><UiText>{"주제"}</UiText>{" "}{track.topicCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <form action={async (fd) => { await moveTrackAction(track.id, "up", trackInitialState, fd); }}>
                  <button className="button-quiet text-xs" type="submit" disabled={index === 0}><UiText>{"위로"}</UiText></button>
                </form>
                <form action={async (fd) => { await moveTrackAction(track.id, "down", trackInitialState, fd); }}>
                  <button className="button-quiet text-xs" type="submit" disabled={index === tracks.length - 1}><UiText>{"아래로"}</UiText></button>
                </form>
                <form action={async (fd) => { await deleteTrackAction(track.id, trackInitialState, fd); }}>
                  <button className="button-quiet text-xs text-[var(--danger)]" type="submit"><UiText>{"삭제"}</UiText></button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted text-sm"><UiText>{"아직 트랙이 없습니다. 창업·융합 등 세부 트랙을 추가해 주세요."}</UiText></p>
      )}
    </div>
  );
}
