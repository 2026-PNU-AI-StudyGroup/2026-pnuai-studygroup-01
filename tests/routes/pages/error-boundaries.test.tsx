import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GlobalError from "@/app/error";
import TeamWorkspaceError from "@/app/projects/[projectId]/error";

describe("오류 경계 탈출 경로", () => {
  it("전역 오류에서 재시도와 안전한 프로젝트 이동 경로를 함께 제공한다", () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("failed")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "프로젝트로 이동" })).toHaveAttribute("href", "/dashboard");
  });

  it("팀 오류에서 재시도 외 프로젝트 목록 탈출 경로를 제공한다", () => {
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<TeamWorkspaceError error={new Error("failed")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "프로젝트 목록으로 이동" })).toHaveAttribute("href", "/dashboard");
  });
});
