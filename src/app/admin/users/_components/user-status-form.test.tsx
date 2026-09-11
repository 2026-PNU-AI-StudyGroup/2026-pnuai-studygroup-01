import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserStatusForm } from "@/app/admin/users/_components/user-status-form";

const base = { userId: "60000000-0000-4000-8000-000000000001", name: "정민서", activeResponsibilityCount: 0 };

describe("UserStatusForm", () => {
  it("자문위원 비활성 계정에는 활성화 버튼을 두지 않고 되살리는 자리를 알린다", () => {
    // 계정만 켜도 초대와 링크가 회수된 채라 들어올 수 없다. 아무 일도 없는 길을 내밀지 않는다.
    render(<UserStatusForm {...base} isActive={false} canReactivate={false} />);

    expect(screen.queryByRole("button", { name: "다시 활성화" })).not.toBeInTheDocument();
    expect(screen.getByText("프로그램 자문위원 화면에서 다시 초대하면 계정도 함께 활성화됩니다.")).toBeInTheDocument();
  });

  it("자문위원도 활성 상태에서는 비활성화할 수 있다", () => {
    render(<UserStatusForm {...base} isActive canReactivate={false} />);

    expect(screen.getByRole("button", { name: "비활성화" })).toBeEnabled();
  });

  it("다른 역할의 비활성 계정은 예전처럼 다시 활성화한다", () => {
    // 학생·교수·관리자는 이 버튼이 유일한 복구 경로다.
    render(<UserStatusForm {...base} isActive={false} />);

    expect(screen.getByRole("button", { name: "다시 활성화" })).toBeEnabled();
  });

  it("담당 프로젝트가 남은 계정은 비활성화를 막고 이유를 밝힌다", () => {
    render(<UserStatusForm {...base} isActive activeResponsibilityCount={2} />);

    expect(screen.getByRole("button", { name: "비활성화" })).toBeDisabled();
    expect(screen.getByText("담당 프로젝트 2건을 먼저 인계하거나 마감해야 합니다.")).toBeInTheDocument();
  });
});
