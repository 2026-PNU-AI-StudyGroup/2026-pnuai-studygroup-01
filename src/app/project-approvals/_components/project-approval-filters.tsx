"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TopicApprovalStatus } from "@/modules/topic-approval/domain/topic-approval-status";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-query";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";

const statusOptions: Array<{ value: TopicApprovalStatus | ""; label: string }> = [
  { value: "", label: "전체 상태" },
  { value: "PENDING", label: "검토 대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
  { value: "WITHDRAWN", label: "철회" },
  { value: "CANCELED", label: "취소" },
];

export function ProjectApprovalFilters({
  programs,
  programId,
  status,
}: {
  programs: Array<{ id: string; name: string; category: string }>;
  programId?: string;
  status?: TopicApprovalStatus;
}) {
  const router = useRouter();
  const [selectedProgramId, setSelectedProgramId] = useState(programId ?? "");
  const [selectedStatus, setSelectedStatus] = useState<TopicApprovalStatus | "">(status ?? "");
  const filtered = Boolean(programId || status);
  return (
    <form
      role="search"
      aria-label="승인 요청 필터"
      className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto_auto] md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(projectApprovalsHref({
          programId: selectedProgramId || undefined,
          status: selectedStatus || undefined,
        }));
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"프로그램"}</UiText>
        <CustomSelect
          ariaLabel="프로그램"
          value={selectedProgramId}
          onValueChange={setSelectedProgramId}
          options={[
            { value: "", label: "전체 프로그램" },
            ...programs.map((program) => ({
              value: program.id,
              label: program.name,
              description: program.category,
            })),
          ]}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"상태"}</UiText>
        <CustomSelect
          ariaLabel="승인 상태"
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as TopicApprovalStatus | "")}
          options={statusOptions}
        />
      </label>
      <button type="submit" className="button-primary min-h-11"><UiText>{"조회"}</UiText></button>
      {filtered ? (
        <Link href={projectApprovalsHref()} className="button-secondary min-h-11"><UiText>{"조건 초기화"}</UiText></Link>
      ) : null}
    </form>
  );
}
