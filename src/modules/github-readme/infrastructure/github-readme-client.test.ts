import { describe, expect, it, vi } from "vitest";

import { downloadGithubImage, fetchGithubReadme, GITHUB_IMAGE_MAX_BYTES } from "@/modules/github-readme/infrastructure/github-readme-client";

const repo = { owner: "alice", repo: "agent" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    if (!route) throw new Error(`unexpected ${url}`);
    return route();
  }) as unknown as typeof fetch;
}

describe("fetchGithubReadme", () => {
  it("제목, 요약, 첫 그림을 돌려준다", async () => {
    const fetch = fakeFetch({
      "https://api.github.com/repos/alice/agent": () => Response.json({ default_branch: "dev", description: null, name: "agent" }),
      "https://api.github.com/repos/alice/agent/readme": () => new Response("# 일정 비서\n\n메일을 읽고 일정을 잡는 에이전트.\n\n![화면](shot.png)"),
    });
    await expect(fetchGithubReadme(repo, { fetch })).resolves.toEqual({
      ok: true,
      preview: {
        title: "일정 비서",
        summary: "메일을 읽고 일정을 잡는 에이전트.",
        imageUrl: "https://raw.githubusercontent.com/alice/agent/dev/shot.png",
      },
    });
  });

  it("레포가 없거나 비공개면 NOT_FOUND", async () => {
    const fetch = fakeFetch({ "https://api.github.com/repos/alice/agent": () => new Response("", { status: 404 }) });
    await expect(fetchGithubReadme(repo, { fetch })).resolves.toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("README 가 없으면 NO_README", async () => {
    const fetch = fakeFetch({
      "https://api.github.com/repos/alice/agent": () => Response.json({ default_branch: "main", name: "agent" }),
      "https://api.github.com/repos/alice/agent/readme": () => new Response("", { status: 404 }),
    });
    await expect(fetchGithubReadme(repo, { fetch })).resolves.toEqual({ ok: false, reason: "NO_README" });
  });

  it("한도 초과와 네트워크 오류는 UNAVAILABLE", async () => {
    const limited = fakeFetch({ "https://api.github.com/repos/alice/agent": () => new Response("", { status: 403 }) });
    await expect(fetchGithubReadme(repo, { fetch: limited })).resolves.toEqual({ ok: false, reason: "UNAVAILABLE" });
    const broken = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    await expect(fetchGithubReadme(repo, { fetch: broken })).resolves.toEqual({ ok: false, reason: "UNAVAILABLE" });
  });

  it("토큰이 있으면 Authorization 을 붙인다", async () => {
    const fetch = fakeFetch({ "https://api.github.com/repos/alice/agent": () => new Response("", { status: 404 }) });
    await fetchGithubReadme(repo, { fetch, token: "t0ken" });
    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t0ken");
  });
});

describe("downloadGithubImage", () => {
  const url = "https://raw.githubusercontent.com/alice/agent/main/a.png";

  it("PNG 를 받는다", async () => {
    const fetch = fakeFetch({ [url]: () => new Response(PNG) });
    await expect(downloadGithubImage(url, { fetch })).resolves.toEqual({ bytes: PNG, contentType: "image/png" });
  });

  it("허용 주소 안의 리다이렉트는 따라간다", async () => {
    const attachment = "https://github.com/user-attachments/assets/1";
    const signed = "https://private-user-images.githubusercontent.com/1/a.png?jwt=x";
    const fetch = fakeFetch({
      [attachment]: () => new Response(null, { status: 302, headers: { location: signed } }),
      [signed]: () => new Response(PNG),
    });
    await expect(downloadGithubImage(attachment, { fetch })).resolves.toEqual({ bytes: PNG, contentType: "image/png" });
  });

  it("허용 주소 밖으로 가는 리다이렉트는 거부한다", async () => {
    const fetch = fakeFetch({ [url]: () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }) });
    await expect(downloadGithubImage(url, { fetch })).resolves.toBeNull();
  });

  it("허용 목록 밖 주소는 요청하지 않는다", async () => {
    const fetch = fakeFetch({});
    await expect(downloadGithubImage("https://i.imgur.com/a.png", { fetch })).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("5MB 를 넘거나 그림이 아니면 null", async () => {
    const big = fakeFetch({ [url]: () => new Response(new Uint8Array(GITHUB_IMAGE_MAX_BYTES + 1)) });
    await expect(downloadGithubImage(url, { fetch: big })).resolves.toBeNull();
    const svg = fakeFetch({ [url]: () => new Response("<svg xmlns=\"http://www.w3.org/2000/svg\"/>") });
    await expect(downloadGithubImage(url, { fetch: svg })).resolves.toBeNull();
  });
});
