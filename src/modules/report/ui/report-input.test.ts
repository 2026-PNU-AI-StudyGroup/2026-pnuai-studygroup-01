import { describe, expect, it } from "vitest";

import { artifactRegistrationSchema, showcaseImageSchema } from "@/modules/report/ui/report-input";

const teamId = "70000000-0000-4000-8000-000000000001";
const uploadId = "80000000-0000-4000-8000-000000000001";

describe("결과물 입력", () => {
  it("일반 결과물 등록에서는 이미지와 포스터를 받지 않는다", () => {
    const base = { teamId, title: "최종 산출물", uploadId };

    expect(artifactRegistrationSchema.safeParse({ ...base, type: "SOURCE_CODE" }).success).toBe(true);
    expect(artifactRegistrationSchema.safeParse({ ...base, type: "OTHER" }).success).toBe(true);
    expect(artifactRegistrationSchema.safeParse({ ...base, type: "IMAGE" }).success).toBe(false);
    expect(artifactRegistrationSchema.safeParse({ ...base, type: "POSTER" }).success).toBe(false);
  });

  it("쇼케이스 이미지는 전용 입력으로만 받는다", () => {
    expect(showcaseImageSchema.safeParse({ teamId, uploadId, title: "대표 이미지", type: "IMAGE" }).success).toBe(true);
  });
});
