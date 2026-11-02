import { describe, expect, it } from "vitest";

import { summaryPreview } from "@/app/archive/_components/public-archive-row";

describe("아카이브 한 줄 미리보기", () => {
  it("마크다운 기호와 그림 문자를 걷어내고 공백을 하나로 접는다", () => {
    expect(summaryPreview("## 손모음 🌱\n\n**문해교육** ✨ 기관을   돕습니다 🙏")).toBe("손모음 문해교육 기관을 돕습니다");
  });

  it("한 줄로 잘릴 글이라 앞 160자만 남긴다", () => {
    expect(summaryPreview("가".repeat(400))).toHaveLength(160);
  });
});
