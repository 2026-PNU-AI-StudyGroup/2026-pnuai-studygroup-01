import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("서비스 목적을 안내한다", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "학과 프로젝트 관리 시스템",
      }),
    ).toBeInTheDocument();
  });
});
