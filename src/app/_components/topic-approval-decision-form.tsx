"use client";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";
import { decideTopicApprovalAction, type TopicApprovalActionState } from "@/app/_actions/topic-approval-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { ChoiceCard } from "@/shared/ui/form-system";
const initial: TopicApprovalActionState = { status: "idle", message: "" };
export function TopicApprovalDecisionForm({ requestId, studentTeamVersion }: { requestId: string; studentTeamVersion?: number | null }) {
  const [state, action, pending] = useActionState(decideTopicApprovalAction, initial);
  return <form action={action} className="grid gap-3">
    <input type="hidden" name="requestId" value={requestId} />
    {studentTeamVersion ? <input type="hidden" name="studentTeamVersion" value={studentTeamVersion} /> : null}
    <label className="grid gap-2 text-sm font-semibold"><UiText>{"검토 의견"}</UiText><UiTextarea className="form-control" name="reviewComment" maxLength={1000} rows={2} placeholder="승인 또는 반려 사유를 남길 수 있습니다." /></label>
    {studentTeamVersion ? <ChoiceCard className="min-h-0 p-3" type="checkbox" name="teamCompositionConfirmed" label="표시된 현재 팀 구성을 확인했습니다. 승인하면 이 인원으로 실행 팀이 즉시 만들어집니다." /> : null}
    <div className="flex justify-end gap-2"><button className="button-secondary" name="decision" value="REJECT" disabled={pending}><UiText>{"반려"}</UiText></button><ConfirmSubmitButton className="button-primary" name="decision" value="APPROVE" disabled={pending} confirmMessage={studentTeamVersion ? "현재 팀 구성으로 승인하고 실행 팀을 만듭니다. 계속할까요?" : "프로젝트를 승인하고 공개합니다. 계속할까요?"}><UiText>{"승인 및 공개"}</UiText></ConfirmSubmitButton></div>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
  </form>;
}
