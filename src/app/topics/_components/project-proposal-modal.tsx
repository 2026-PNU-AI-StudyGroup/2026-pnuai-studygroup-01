"use client";

import { createTopicAction } from "@/app/_actions/create-topic-action";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import { UiOl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TopicForm } from "@/modules/topic/ui/topic-form";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";
import { SplitDialog } from "@/shared/ui/split-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function formSnapshot(form: HTMLFormElement): string {
  return JSON.stringify(Array.from(new FormData(form).entries()));
}

export function ProjectProposalModal({ programs, defaultProgramId, professors, studentTeams, closeHref }: {
  programs: ProjectProgramRecord[];
  defaultProgramId?: string;
  professors: Array<{ id: string; name: string; email: string }>;
  studentTeams: Array<{ id: string; name: string; memberCount: number; pendingInvitationCount?: number }>;
  closeHref: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const initialFormSnapshotRef = useRef("");
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
  const [step, setStep] = useState({ index: 0, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] });

  useEffect(() => {
    const form = dialogRef.current?.querySelector("form");
    if (form) initialFormSnapshotRef.current = formSnapshot(form);
  }, []);

  const updateStep = useCallback((next: { index: number; labels: string[] }) => {
    setStep((current) => current.index === next.index && current.labels.join("\n") === next.labels.join("\n") ? current : next);
  }, []);

  const requestClose = useCallback(() => {
    const form = dialogRef.current?.querySelector("form");
    if (form && initialFormSnapshotRef.current !== formSnapshot(form)) {
      setDiscardConfirmationOpen(true);
      return;
    }
    router.replace(closeHref);
  }, [closeHref, router]);

  const createTeamHref = "/teams?modal=create";

  return (
    <SplitDialog
      dialogRef={dialogRef}
      closeButtonRef={closeButtonRef}
      openOnMount
      eyebrow={`${step.index + 1} / ${step.labels.length}`}
      title="프로젝트 제안"
      context={step.labels[step.index]}
      steps={(
        <UiOl aria-label="프로젝트 제안 단계" className="mt-8 grid gap-3 text-xs font-bold">
          {step.labels.map((label, index) => (
            <li key={label} className={index === step.index ? "text-[var(--primary)]" : "text-[var(--muted)]"}>
              {index + 1}. <UiText>{label}</UiText>
            </li>
          ))}
        </UiOl>
      )}
      closeLabel="프로젝트 제안 닫기"
      onRequestClose={requestClose}
    >
      <div className="px-6 py-7 sm:px-8 lg:px-10 lg:py-9">
        <TopicForm
          action={createTopicAction}
          programs={programs}
          defaultProgramId={defaultProgramId}
          studentApproval={{ professors, studentTeams }}
          wizard={{ closeHref, createTeamHref, onStepChange: updateStep }}
        />
      </div>
      <ConfirmationDialog
        open={discardConfirmationOpen}
        title="작성 중인 내용 삭제"
        description="닫으면 입력한 내용이 사라집니다. 계속하시겠습니까?"
        confirmLabel="계속"
        onConfirm={() => router.replace(closeHref)}
        onCancel={() => setDiscardConfirmationOpen(false)}
        returnFocusRef={closeButtonRef}
      />
    </SplitDialog>
  );
}
