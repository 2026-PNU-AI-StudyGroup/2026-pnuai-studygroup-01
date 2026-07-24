import type { ProgramActionState } from "@/app/admin/programs/_actions/program-actions";

export const initialProgramActionState: ProgramActionState = {
  status: "idle",
  message: "",
};
