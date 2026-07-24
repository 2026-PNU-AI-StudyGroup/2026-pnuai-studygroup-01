import type { RecruitmentActionState } from "@/app/recruitments/_actions/recruitment-actions";

export const initialRecruitmentActionState: RecruitmentActionState = {
  status: "idle",
  message: "",
};
