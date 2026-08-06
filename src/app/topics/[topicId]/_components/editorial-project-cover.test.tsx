import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorialProjectCover } from "@/app/topics/[topicId]/_components/editorial-project-cover";

describe("EditorialProjectCover", () => {
  it("프로그램명과 부산대 심볼을 사용하는 공식 기본 커버를 표시한다", () => {
    const { container } = render(<EditorialProjectCover label="CSE 캡스톤디자인 2025" />);

    expect(screen.getByText("CSE 캡스톤디자인 2025")).toBeInTheDocument();
    expect(container.querySelector("[data-editorial-project-cover] [data-pnu-mark]")).toBeInTheDocument();
  });
});
