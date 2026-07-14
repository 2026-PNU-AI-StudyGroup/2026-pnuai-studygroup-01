import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "@/shared/ui/page-primitives";

describe("ProgressBar", () => {
  it("진행률을 접근 가능한 범위로 제한한다", () => {
    const { rerender } = render(<ProgressBar value={120} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

    rerender(<ProgressBar value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
