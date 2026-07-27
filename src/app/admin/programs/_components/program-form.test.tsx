import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/app/admin/programs/_actions/program-actions", () => ({
  createProgramAction: vi.fn(async () => ({ status: "idle", message: "" })),
}));

import { ProgramForm } from "@/app/admin/programs/_components/program-form";

describe("ProgramForm", () => {
  it("관리자가 프로그램 생성 시 지도교수 운영 여부를 명시적으로 지정한다", () => {
    render(
      <ProgramForm
        cycles={[{ id: "cycle-1", academicYear: 2026, term: "FIRST" }]}
      />,
    );

    expect(screen.getByRole("radio", { name: /지도교수 있음/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /지도교수 없음/ })).not.toBeChecked();
  });
});
