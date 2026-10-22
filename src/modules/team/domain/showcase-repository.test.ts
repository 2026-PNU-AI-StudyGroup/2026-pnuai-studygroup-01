import { describe, expect, it } from "vitest";

import { parseGithubRepo, resolveShowcaseRepository } from "@/modules/team/domain/showcase-repository";

describe("화면에 내보일 저장소 고르기", () => {
  it("주제에 적은 주소가 소스 코드 결과물보다 먼저다", () => {
    expect(resolveShowcaseRepository({
      sourceUrl: "https://github.com/org/from-topic",
      artifacts: [{ id: "a1", type: "SOURCE_CODE", externalUrl: "https://github.com/org/from-artifact" }],
    })).toEqual({ url: "https://github.com/org/from-topic", owner: "org", repo: "from-topic", artifactId: undefined });
  });

  it("주제 주소가 없으면 소스 코드 결과물을 쓴다", () => {
    expect(resolveShowcaseRepository({
      sourceUrl: null,
      artifacts: [{ id: "a1", type: "SOURCE_CODE", externalUrl: "https://github.com/org/repo.git" }],
    })).toEqual({ url: "https://github.com/org/repo.git", owner: "org", repo: "repo", artifactId: "a1" });
  });

  it("GitHub 저장소 주소가 아니면 고르지 않는다", () => {
    expect(resolveShowcaseRepository({ sourceUrl: "https://gitlab.com/org/repo", artifacts: [] })).toBeNull();
    expect(parseGithubRepo("https://github.com/only-org")).toBeNull();
  });
});
