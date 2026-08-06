import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AdminSection,
  AdminSectionEmpty,
  adminRecordListClassName,
  adminRecordRowClassName,
} from "@/app/_components/admin-section";

describe("AdminSection", () => {
  it("관리 목록의 제목, 설명, 메타데이터와 패널 표면을 공통 구조로 제공한다", () => {
    render(
      <AdminSection
        id="admin-users-title"
        title="가입 사용자"
        description="가입한 구성원을 관리합니다."
        meta="총 2명"
      >
        <ol className={adminRecordListClassName}>
          <li className={adminRecordRowClassName}>홍길동</li>
        </ol>
      </AdminSection>,
    );

    const section = screen.getByRole("region", { name: "가입 사용자" });
    expect(section).toHaveClass("admin-panel", "overflow-hidden");
    expect(screen.getByText("가입한 구성원을 관리합니다.")).toBeInTheDocument();
    expect(screen.getByText("총 2명")).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("divide-y", "bg-white");
    expect(screen.getByRole("listitem")).toHaveClass("record-row", "px-5", "py-5");
  });

  it("빈 상태를 패널 내부 여백으로 감싼다", () => {
    const { container } = render(
      <AdminSectionEmpty>
        <p>항목이 없습니다.</p>
      </AdminSectionEmpty>,
    );

    expect(container.firstChild).toHaveClass("px-5", "sm:px-6");
  });
});
