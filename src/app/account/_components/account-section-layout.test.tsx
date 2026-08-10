import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountSectionLayout } from "./account-section-layout";

describe("AccountSectionLayout", () => {
  it("내 계정 제목과 본문을 렌더한다", () => {
    render(<AccountSectionLayout><p>계정 본문</p></AccountSectionLayout>);
    expect(screen.getByRole("heading", { name: "내 계정" })).toBeInTheDocument();
    expect(screen.getByText("계정 본문")).toBeInTheDocument();
  });
});
