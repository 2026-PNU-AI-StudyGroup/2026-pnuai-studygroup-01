"use client";

import { useRouter } from "next/navigation";

import type { TopicApprovalStatus } from "@/modules/topic-approval/application/manage-topic-approvals";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-route";
import { UiDiv } from "@/modules/translation/ui/localized-elements";
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
  pendingCountByProgram,
}: {
  programs: Array<{ id: string; name: string; category: string }>;
  programId?: string;
  status?: TopicApprovalStatus;
  pendingCountByProgram: Record<string, number>;
}) {
  const router = useRouter();
  const totalPending = Object.values(pendingCountByProgram).reduce((total, count) => total + count, 0);
  const update = (next: { programId?: string; status?: TopicApprovalStatus }) => {
    router.replace(projectApprovalsHref(next));
  };

  return (
    <UiDiv aria-label="승인 요청 필터" className="flex flex-wrap items-center gap-2">
      <CustomSelect
        ariaLabel="프로그램"
        density="compact"
        className="min-w-[13rem]"
        value={programId ?? ""}
        onValueChange={(value) => update({ programId: value || undefined, status })}
        options={[
          { value: "", label: "전체 프로그램" },
          ...programs.map((program) => ({
            value: program.id,
            label: program.name,
            description: `${program.category} · 승인 대기 ${pendingCountByProgram[program.id] ?? 0}건`,
          })),
        ]}
      />
      <CustomSelect
        ariaLabel="상태"
        density="compact"
        className="min-w-[8.5rem]"
        value={status ?? ""}
        onValueChange={(value) => update({ programId, status: (value || undefined) as TopicApprovalStatus | undefined })}
        options={statusOptions.map((option) => option.value === "PENDING"
          ? { ...option, description: `현재 ${totalPending}건` }
          : option)}
      />
    </UiDiv>
  );
}
