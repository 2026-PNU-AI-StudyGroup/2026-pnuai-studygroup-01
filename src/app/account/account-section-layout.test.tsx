import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountSectionLayout } from "./account-section-layout";

describe("AccountSectionLayout", () => {
  it("학생에게 프로젝트 프로필 메뉴를 제공한다", () => {
    render(<AccountSectionLayout role="STUDENT" currentPath="/account"><p>계정</p></AccountSectionLayout>);
    expect(screen.getByRole("link", { name: "프로젝트 프로필" })).toHaveAttribute("href", "/account/profile");
  });

  it("교수와 관리자에게 학생 전용 프로필 메뉴를 노출하지 않는다", () => {
    const { rerender } = render(<AccountSectionLayout role="PROFESSOR" currentPath="/account"><p>계정</p></AccountSectionLayout>);
    expect(screen.queryByRole("link", { name: "프로젝트 프로필" })).not.toBeInTheDocument();

    rerender(<AccountSectionLayout role="ADMIN" currentPath="/account"><p>계정</p></AccountSectionLayout>);
    expect(screen.queryByRole("link", { name: "프로젝트 프로필" })).not.toBeInTheDocument();
  });
});
