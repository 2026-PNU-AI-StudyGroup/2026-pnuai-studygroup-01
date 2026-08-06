import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonAvatar } from "@/shared/ui/person-avatar";

describe("PersonAvatar", () => {
  it("사진이 없으면 글자 없이 중립 사람 아이콘을 표시한다", () => {
    const { container } = render(<PersonAvatar userId="user-1" updatedAt={null} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("u");
  });

  it("사진 로드 오류 시 같은 중립 아이콘으로 되돌린다", () => {
    const { container } = render(<PersonAvatar userId="user-1" updatedAt="2026-08-07T00:00:00.000Z" />);
    fireEvent.error(container.querySelector("img")!);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
