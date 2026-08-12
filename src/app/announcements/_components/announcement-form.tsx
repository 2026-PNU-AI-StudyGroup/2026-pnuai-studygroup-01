"use client";

import { useActionState, useState } from "react";

import {
  createAnnouncementAction,
  type AnnouncementActionState,
  updateAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from "@/app/announcements/_lib/announcement-categories";
import { AnnouncementTargetPicker } from "@/app/announcements/_components/announcement-target-picker";
import type { AnnouncementTargets } from "@/app/announcements/_lib/announcement-audience";
import type { AnnouncementCategory, AnnouncementVisibility } from "@/modules/announcement/application/announcement-ports";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { ChoiceCard, Toggle } from "@/shared/ui/form-system";

const CATEGORY_OPTIONS = ANNOUNCEMENT_CATEGORIES.map((value) => ({
  value,
  label: ANNOUNCEMENT_CATEGORY_LABELS[value],
}));

const initialState: AnnouncementActionState = {
  status: "idle",
  message: "",
};

export function AnnouncementForm({
  announcementId,
  targets,
  initialTitle = "",
  initialContent = "",
  initialCategory = "GENERAL",
  initialPinned = false,
  initialTarget = "",
  initialVisibility = "AUTHENTICATED",
}: {
  announcementId?: string;
  targets: AnnouncementTargets;
  initialTitle?: string;
  initialContent?: string;
  initialCategory?: AnnouncementCategory;
  initialPinned?: boolean;
  initialTarget?: string;
  initialVisibility?: AnnouncementVisibility;
}) {
  const action = announcementId
    ? updateAnnouncementAction.bind(null, announcementId)
    : createAnnouncementAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [target, setTarget] = useState(initialTarget);
  const [visibility, setVisibility] = useState<AnnouncementVisibility>(initialVisibility);
  const editing = Boolean(announcementId);
  const isProgramTarget = target.startsWith("program:");

  const changeTarget = (nextTarget: string) => {
    setTarget(nextTarget);
    if (nextTarget.startsWith("team:")) setVisibility("TARGET_MEMBERS");
    else if (nextTarget.startsWith("program:") && nextTarget !== target) setVisibility("AUTHENTICATED");
    else if (!nextTarget.startsWith("program:")) setVisibility("AUTHENTICATED");
  };

  return (
    <form action={formAction} className="panel overflow-hidden">
      <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <label className="grid max-w-xs gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"분류"}</UiText></span>
          <CustomSelect
            name="category"
            ariaLabel="공지 분류"
            options={CATEGORY_OPTIONS}
            defaultValue={initialCategory}
          />
        </label>
        <div className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"대상"}</UiText></span>
          <AnnouncementTargetPicker programs={targets.programs} teams={targets.teams} value={target} onValueChange={changeTarget} />
          <span className="text-xs font-medium text-[var(--muted)]">
            <UiText>{isProgramTarget
              ? "프로그램 공지는 로그인 사용자 전체 또는 프로그램 구성원에게 공개할 수 있습니다."
              : target.startsWith("team:")
                ? "팀 공지는 해당 팀 구성원에게만 공개됩니다."
                : "전체 공지는 모든 로그인 사용자에게 공개됩니다."}</UiText>
          </span>
        </div>
        {isProgramTarget ? (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--ink)]"><UiText>{"열람 범위"}</UiText></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <VisibilityOption
                value="AUTHENTICATED"
                checked={visibility === "AUTHENTICATED"}
                onChange={setVisibility}
                label="로그인 사용자 전체"
                description="프로그램 소속과 관계없이 볼 수 있습니다."
              />
              <VisibilityOption
                value="TARGET_MEMBERS"
                checked={visibility === "TARGET_MEMBERS"}
                onChange={setVisibility}
                label="프로그램 구성원만"
                description="소속 학생·지도교수·담당 교수만 볼 수 있습니다."
              />
            </div>
          </fieldset>
        ) : <input type="hidden" name="visibility" value={visibility} />}
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"제목"}</UiText></span>
          <UiInput
            className="form-control bg-[var(--surface)]"
            name="title"
            type="text"
            maxLength={120}
            defaultValue={initialTitle}
            placeholder="공지 제목을 입력하세요"
            required
            autoFocus
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"본문"}</UiText></span>
          <UiTextarea
            className="form-control min-h-80 bg-[var(--surface)] leading-7"
            name="content"
            maxLength={20_000}
            defaultValue={initialContent}
            placeholder="구성원이 알아야 할 내용을 입력하세요"
            required
          />
        </label>
        <Toggle name="pinned" defaultChecked={initialPinned} label="목록 상단에 고정" />
        {state.message ? (
          <p
            className="rounded-[var(--radius-control)] bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--danger)]"
            role="alert"
          >
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-8">
        <button
          className="button-primary max-sm:w-full"
          type="submit"
          disabled={pending}
        >
          <UiText>{pending
            ? editing ? "수정 중" : "등록 중"
            : editing ? "수정 완료" : "공지 등록"}</UiText>
        </button>
      </div>
    </form>
  );
}

function VisibilityOption({ value, checked, onChange, label, description }: {
  value: AnnouncementVisibility;
  checked: boolean;
  onChange: (value: AnnouncementVisibility) => void;
  label: string;
  description: string;
}) {
  return <ChoiceCard
    type="radio"
    name="visibility"
    value={value}
    checked={checked}
    onChange={() => onChange(value)}
    label={label}
    description={description}
    className={checked ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--field-border)] bg-[var(--surface)] hover:border-[var(--line-strong)]"}
  />;
}
