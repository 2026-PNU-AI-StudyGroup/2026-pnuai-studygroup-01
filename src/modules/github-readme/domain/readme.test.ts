import { describe, expect, it } from "vitest";

import { readmeImageCandidates, isAllowedGithubAssetUrl, parseGithubRepo } from "@/modules/github-readme/domain/readme";

const source = { owner: "alice", repo: "agent", branch: "main" };

describe("parseGithubRepo", () => {
  it("레포 주소에서 owner 와 repo 를 뽑는다", () => {
    expect(parseGithubRepo("https://github.com/Alice/Agent")).toEqual({ owner: "alice", repo: "agent" });
    expect(parseGithubRepo("https://github.com/alice/agent.git")).toEqual({ owner: "alice", repo: "agent" });
    expect(parseGithubRepo("https://github.com/alice/agent/tree/main/src")).toEqual({ owner: "alice", repo: "agent" });
  });

  it("GitHub 레포가 아니면 null", () => {
    expect(parseGithubRepo("https://gitlab.com/alice/agent")).toBeNull();
    expect(parseGithubRepo("https://github.com/alice")).toBeNull();
    expect(parseGithubRepo("not a url")).toBeNull();
    expect(parseGithubRepo("https://github.com/../agent")).toBeNull();
    expect(parseGithubRepo("https://github.com/alice/..")).toBeNull();
    expect(parseGithubRepo("https://github.com/./agent")).toBeNull();
  });
});

describe("isAllowedGithubAssetUrl", () => {
  it("GitHub 그림 주소만 받는다", () => {
    expect(isAllowedGithubAssetUrl("https://raw.githubusercontent.com/alice/agent/main/a.png")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://github.com/user-attachments/assets/1234")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://private-user-images.githubusercontent.com/1/a.png?jwt=x")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://github-production-user-asset-6210df.s3.amazonaws.com/1/a.png?X-Amz-Signature=x")).toBe(true);
    expect(isAllowedGithubAssetUrl("https://other-bucket.s3.amazonaws.com/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://github.com/alice/agent")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://i.imgur.com/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("http://raw.githubusercontent.com/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://raw.githubusercontent.com:8443/a.png")).toBe(false);
    expect(isAllowedGithubAssetUrl("https://user@raw.githubusercontent.com/a.png")).toBe(false);
  });
});

describe("readmeImageCandidates", () => {
  it("상대 경로를 기본 브랜치 원본 주소로 바꾼다", () => {
    expect(readmeImageCandidates("# 제목\n\n![화면](./docs/screen.png)", source))
      .toEqual(["https://raw.githubusercontent.com/alice/agent/main/docs/screen.png"]);
  });

  it("배지는 건너뛰고 문서 순서대로 고른다", () => {
    const markdown = [
      "![build](https://img.shields.io/badge/build-passing-green)",
      "<img src=\"images/main.webp\" width=\"600\">",
      "![두번째](second.png)",
    ].join("\n");
    expect(readmeImageCandidates(markdown, source)).toEqual([
      "https://raw.githubusercontent.com/alice/agent/main/images/main.webp",
      "https://raw.githubusercontent.com/alice/agent/main/second.png",
    ]);
  });

  it("blob 주소는 raw 주소로 바꾼다", () => {
    expect(readmeImageCandidates("![a](https://github.com/alice/agent/blob/main/a.png?raw=true)", source))
      .toEqual(["https://raw.githubusercontent.com/alice/agent/main/a.png"]);
  });

  it("허용 목록 밖 그림과 상위 경로는 버린다", () => {
    expect(readmeImageCandidates("![a](https://i.imgur.com/a.png)\n![b](../b.png)", source)).toEqual([]);
  });

  it("SVG 와 GIF 는 건너뛰고 확장자 없는 첨부 그림은 남긴다", () => {
    const markdown = [
      "<img src=\"./frontend/src/assets/thumbnail.svg\" width=\"830\"/>",
      "![demo](demo.gif)",
      "<img alt=\"arch\" src=\"https://github.com/user-attachments/assets/1752d050\" />",
    ].join("\n");
    expect(readmeImageCandidates(markdown, source)).toEqual(["https://github.com/user-attachments/assets/1752d050"]);
  });

  it("그림이 없으면 빈 목록", () => {
    expect(readmeImageCandidates("# 제목\n\n설명만 있다.", source)).toEqual([]);
  });
});
