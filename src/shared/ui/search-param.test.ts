import { describe, expect, it } from "vitest";

import { firstSearchParam } from "@/shared/ui/search-param";

describe("검색 파라미터 정규화", () => {
  it("중복 키는 첫 번째 문자열만 사용한다", () => {
    expect(firstSearchParam(["first", "second"])).toBe("first");
  });

  it("단일 값과 누락 값을 그대로 보존한다", () => {
    expect(firstSearchParam("value")).toBe("value");
    expect(firstSearchParam(undefined)).toBeUndefined();
  });
});
