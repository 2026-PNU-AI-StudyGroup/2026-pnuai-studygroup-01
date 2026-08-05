import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SuccessToast } from "@/shared/ui/success-toast";

describe("SuccessToast", () => {
  it("성공 메시지를 하나의 접근 가능한 상태 영역으로 알린다", () => {
    const { rerender } = render(<SuccessToast message="저장했습니다." />);

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("저장했습니다.");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveAttribute("aria-atomic", "true");
    expect(toast).toHaveClass("border-[var(--primary)]", "bg-white", "text-[var(--ink)]");

    rerender(<SuccessToast message="" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
